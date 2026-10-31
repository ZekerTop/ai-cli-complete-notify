const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const claimModulePath = path.join(projectRoot, 'src', 'codex-notification-claim.js');
const workerSource = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const options = JSON.parse(process.env.CODEX_CLAIM_TEST_OPTIONS);
if (options.renameFailures) {
  const rename = fs.renameSync;
  let remaining = options.renameFailures;
  fs.renameSync = (...args) => {
    if (remaining-- > 0) {
      throw Object.assign(new Error('Temporary Windows rename contention'), { code: 'EPERM' });
    }
    return rename(...args);
  };
}
if (options.clockOffsetMs) {
  const realNow = Date.now;
  Date.now = () => realNow() + options.clockOffsetMs;
}
const { acquireCodexNotificationClaim } = require(process.env.CODEX_CLAIM_TEST_MODULE);
let claim;
const send = (message) => process.send({ id: options.id, ...message });
process.on('message', async (message) => {
  try {
    if (message.type === 'go') {
      send({ type: 'attempted' });
      claim = await acquireCodexNotificationClaim(options.key, {
        dedupeMs: 60000,
        leaseMs: options.leaseMs || 2000,
        pollMs: 10,
      });
      if (!claim) {
        send({ type: 'result', status: 'skipped' });
        process.disconnect();
        return;
      }
      send({ type: 'acquired' });
      if (options.blockMs) {
        send({ type: 'blocking' });
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, options.blockMs);
        send({ type: 'unblocked' });
      }
    } else if (message.type === 'complete') {
      let success = message.outcome === 'success';
      let owned;
      try {
        if (message.outcome === 'throw') throw new Error('simulated notifier failure');
        if (success) {
          fs.writeFileSync(path.join(options.deliveriesDir, options.id + '.json'), JSON.stringify({ key: options.key }));
        }
      } catch (error) {
        success = false;
        send({ type: 'caught', error: error.message });
      } finally {
        owned = await claim.complete(success);
      }
      send({ type: 'result', status: success ? 'success' : 'failure', owned });
      process.disconnect();
    }
  } catch (error) {
    send({ type: 'error', error: error.stack || String(error) });
    process.exitCode = 1;
    process.disconnect();
  }
});
send({ type: 'ready' });
`;

function createHarness(t) {
  const target = path.join(projectRoot, 'src-tauri', 'target');
  fs.mkdirSync(target, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(target, 'codex-claim-'));
  const deliveriesDir = path.join(sandbox, 'deliveries');
  const homeDir = path.join(sandbox, 'home');
  const dataDir = path.join(sandbox, 'data');
  fs.mkdirSync(deliveriesDir);
  fs.mkdirSync(homeDir);
  const workers = [];

  t.after(async () => {
    for (const worker of workers) {
      if (!worker.closed) worker.child.kill('SIGKILL');
    }
    await Promise.all(workers.map((worker) => worker.done));
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  function worker(id, key, options = {}) {
    const child = spawn(process.execPath, ['-e', workerSource], {
      cwd: sandbox,
      env: {
        ...process.env,
        HOME: homeDir,
        USERPROFILE: homeDir,
        APPDATA: homeDir,
        CODEX_HOME: path.join(homeDir, '.codex'),
        AI_CLI_COMPLETE_NOTIFY_DATA_DIR: dataDir,
        CODEX_CLAIM_TEST_MODULE: claimModulePath,
        CODEX_CLAIM_TEST_OPTIONS: JSON.stringify({ id, key, deliveriesDir, ...options }),
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const entry = { child, id, messages: [], output: '', closed: false };
    child.on('message', (message) => entry.messages.push(message));
    child.stdout.on('data', (data) => { entry.output += data; });
    child.stderr.on('data', (data) => { entry.output += data; });
    entry.done = new Promise((resolve) => child.once('close', (code, signal) => {
      entry.closed = true;
      entry.exit = { code, signal };
      resolve(entry.exit);
    }));
    workers.push(entry);
    return entry;
  }

  return {
    worker,
    deliveries: () => fs.readdirSync(deliveriesDir),
    dataDir,
  };
}

function waitForAny(workers, type) {
  for (const worker of workers) {
    const message = worker.messages.find((item) => item.type === type);
    if (message) return Promise.resolve({ worker, message });
  }
  return new Promise((resolve, reject) => {
    const listeners = [];
    const finish = (error, result) => {
      clearTimeout(timer);
      for (const [child, event, listener] of listeners) child.removeListener(event, listener);
      if (error) reject(error);
      else resolve(result);
    };
    const diagnose = () => workers.map((worker) => ({
      id: worker.id,
      exit: worker.exit,
      messages: worker.messages,
      output: worker.output,
    }));
    const timer = setTimeout(() => finish(new Error(`Timed out waiting for ${type}: ${JSON.stringify(diagnose())}`)), 8000);
    for (const worker of workers) {
      const onMessage = (message) => {
        if (message.type === 'error') finish(new Error(message.error));
        else if (message.type === type) finish(null, { worker, message });
      };
      const onClose = () => {
        if (workers.every((item) => item.closed)) {
          finish(new Error(`Workers exited before ${type}: ${JSON.stringify(diagnose())}`));
        }
      };
      worker.child.on('message', onMessage);
      worker.child.on('close', onClose);
      listeners.push([worker.child, 'message', onMessage], [worker.child, 'close', onClose]);
      const failure = worker.messages.find((item) => item.type === 'error');
      if (failure) {
        finish(new Error(failure.error));
        return;
      }
    }
    if (workers.every((item) => item.closed)) {
      finish(new Error(`Workers exited before ${type}: ${JSON.stringify(diagnose())}`));
    }
  });
}

async function waitFor(worker, type) {
  return (await waitForAny([worker], type)).message;
}

async function startTogether(workers) {
  await Promise.all(workers.map((worker) => waitFor(worker, 'ready')));
  for (const worker of workers) worker.child.send({ type: 'go' });
  await Promise.all(workers.map((worker) => waitFor(worker, 'attempted')));
}

async function complete(worker, outcome = 'success') {
  worker.child.send({ type: 'complete', outcome });
  return waitFor(worker, 'result');
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('Codex claims allow only one sender when processes race on the same turn', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const workers = Array.from({ length: 6 }, (_, index) => harness.worker(`race-${index}`, 'codex-complete:race'));
  await startTogether(workers);
  const { worker: owner } = await waitForAny(workers, 'acquired');
  await complete(owner);
  const results = await Promise.all(workers.map((worker) => waitFor(worker, 'result')));
  assert.equal(results.filter((result) => result.status === 'success').length, 1);
  assert.equal(results.filter((result) => result.status === 'skipped').length, 5);
  assert.equal(workers.flatMap((worker) => worker.messages).filter((message) => message.type === 'acquired').length, 1);
  assert.equal(harness.deliveries().length, 1);
  assert.ok(fs.existsSync(path.join(harness.dataDir, 'codex-notification-claims')));
});

for (const outcome of ['failure', 'throw']) {
  test(`Codex waiting candidate takes over after the first sender reports ${outcome}`, { timeout: 15000 }, async (t) => {
    const harness = createHarness(t);
    const owner = harness.worker('owner', `codex-complete:${outcome}`);
    const waiter = harness.worker('waiter', `codex-complete:${outcome}`);
    await startTogether([owner]);
    await waitFor(owner, 'acquired');
    await startTogether([waiter]);
    await pause(80);
    assert.equal(waiter.messages.some((message) => ['acquired', 'result'].includes(message.type)), false);
    assert.equal((await complete(owner, outcome)).status, 'failure');
    if (outcome === 'throw') assert.match((await waitFor(owner, 'caught')).error, /simulated notifier failure/);
    await waitFor(waiter, 'acquired');
    assert.equal((await complete(waiter)).status, 'success');
    const probe = harness.worker('probe', `codex-complete:${outcome}`);
    await startTogether([probe]);
    assert.equal((await waitFor(probe, 'result')).status, 'skipped');
    assert.deepEqual(harness.deliveries(), ['waiter.json']);
  });
}

test('Codex claims keep successful records for distinct turns written concurrently', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const keys = Array.from({ length: 6 }, (_, index) => `codex-complete:session-${index}:turn-a`);
  const owners = keys.map((key, index) => harness.worker(`owner-${index}`, key));
  await startTogether(owners);
  await Promise.all(owners.map((owner) => waitFor(owner, 'acquired')));
  const results = await Promise.all(owners.map((owner) => complete(owner)));
  assert.equal(results.every((result) => result.status === 'success'), true);
  const probes = keys.map((key, index) => harness.worker(`probe-${index}`, key));
  await startTogether(probes);
  const probeResults = await Promise.all(probes.map((probe) => waitFor(probe, 'result')));
  assert.equal(probeResults.every((result) => result.status === 'skipped'), true);
  assert.equal(harness.deliveries().length, keys.length);
});

test('Codex claims recover from temporary Windows rename contention', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const owner = harness.worker('owner', 'codex-complete:windows-rename', { renameFailures: 2 });
  await startTogether([owner]);
  await waitFor(owner, 'acquired');
  assert.equal((await complete(owner)).status, 'success');
  const probe = harness.worker('probe', 'codex-complete:windows-rename');
  await startTogether([probe]);
  assert.equal((await waitFor(probe, 'result')).status, 'skipped');
  assert.deepEqual(harness.deliveries(), ['owner.json']);
});

test('Codex waiting candidate recovers when its owner process exits unexpectedly', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const owner = harness.worker('owner', 'codex-complete:crash', { leaseMs: 10000 });
  const waiter = harness.worker('waiter', 'codex-complete:crash', { leaseMs: 10000 });
  await startTogether([owner]);
  await waitFor(owner, 'acquired');
  await startTogether([waiter]);
  owner.child.kill('SIGKILL');
  await owner.done;
  await waitFor(waiter, 'acquired');
  assert.equal((await complete(waiter)).status, 'success');
  assert.deepEqual(harness.deliveries(), ['waiter.json']);
});

test('Codex successful completion can be reclaimed after its dedupe window expires', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const owner = harness.worker('owner', 'codex-complete:expired-success');
  await startTogether([owner]);
  await waitFor(owner, 'acquired');
  await complete(owner);
  const freshProbe = harness.worker('fresh-probe', 'codex-complete:expired-success');
  await startTogether([freshProbe]);
  assert.equal((await waitFor(freshProbe, 'result')).status, 'skipped');
  const expiredProbe = harness.worker('expired-probe', 'codex-complete:expired-success', { clockOffsetMs: 61000 });
  await startTogether([expiredProbe]);
  await waitFor(expiredProbe, 'acquired');
  assert.equal((await complete(expiredProbe)).status, 'success');
  assert.equal(harness.deliveries().length, 2);
});

test('Codex expired lease can be taken over without the stale owner releasing its replacement', { timeout: 15000 }, async (t) => {
  const harness = createHarness(t);
  const key = 'codex-complete:expired-lease';
  const owner = harness.worker('stale-owner', key, { leaseMs: 200, blockMs: 1500 });
  const replacement = harness.worker('replacement', key, { leaseMs: 200 });
  const probe = harness.worker('probe', key, { leaseMs: 200 });
  await Promise.all([owner, replacement, probe].map((worker) => waitFor(worker, 'ready')));
  await startTogether([owner]);
  await waitFor(owner, 'blocking');
  await startTogether([replacement]);
  await waitFor(replacement, 'acquired');
  assert.equal(owner.messages.some((message) => message.type === 'unblocked'), false);
  await waitFor(owner, 'unblocked');
  assert.equal((await complete(owner, 'failure')).owned, false);
  await startTogether([probe]);
  await pause(80);
  assert.equal(probe.messages.some((message) => ['acquired', 'result'].includes(message.type)), false);
  await complete(replacement);
  assert.equal((await waitFor(probe, 'result')).status, 'skipped');
  assert.deepEqual(harness.deliveries(), ['replacement.json']);
});
