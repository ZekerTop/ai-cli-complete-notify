const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { buildDeepseekPlugin, createDeepseekRuntime, createDeepseekTransport } = require('../src/deepseek-plugin');

function session(id, header = {}) {
  return { id, header: { id, cwd: '/workspace/shared', ...header } };
}

function event(type, data, time = 1000) {
  return { type, data, time, seq: 1 };
}

function user(text, kind = 'user') {
  return event('user/message', { id: 'message', role: 'user', source: { kind }, content: [{ type: 'text', text }] });
}

function assistant(turn, text, extra = []) {
  return event('assistant/message', { turn, step: 1, message: { role: 'assistant', content: [{ type: 'text', text }, ...extra] } });
}

function complete(runtime, subject, turn, text = 'done', kind = 'completed') {
  runtime.onEvent(subject, event('turn/start', { turn }, 1000));
  runtime.onEvent(subject, user('please finish'));
  runtime.onEvent(subject, assistant(turn, text));
  runtime.onEvent(subject, event('turn/end', { turn, reason: { kind } }, 2000));
}

test('DeepSeek runtime sends the last visible reply after a committed interactive turn', async () => {
  const sent = [];
  const runtime = createDeepseekRuntime({ send: (payload) => sent.push(payload), getCwd: () => '/workspace/current' });
  const subject = session('main');
  runtime.onEvent(subject, event('turn/start', { turn: 1 }, 1500));
  runtime.onEvent(subject, user('do this'));
  runtime.onEvent(subject, assistant(1, 'earlier progress'));
  runtime.onEvent(subject, assistant(1, 'final ', [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text: 'answer' }]));
  const ending = event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 2900);
  assert.equal(runtime.onEvent(subject, ending), undefined);
  runtime.onEvent(subject, ending);
  assert.equal(sent.length, 0, 'transport must be deferred out of the session observer');
  await runtime.drain();
  assert.deepEqual(sent, [{
    hook_event_name: 'TurnEnd', session_id: 'main', turn_id: 1, cwd: '/workspace/current',
    started_at: 1500, completed_at: 2900, user_prompt: 'do this', last_assistant_message: 'final answer', reason: 'completed',
  }]);
});

test('DeepSeek runtime assigns user messages before and after turn/start without carrying prior text', async () => {
  const sent = [];
  const runtime = createDeepseekRuntime({ send: (payload) => sent.push(payload) });
  const subject = session('before-start');
  runtime.onEvent(subject, user('first prompt'));
  runtime.onEvent(subject, event('turn/start', { turn: 1 }, 100));
  runtime.onEvent(subject, assistant(1, 'first reply'));
  runtime.onEvent(subject, event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 200));
  runtime.onEvent(subject, user('second prompt'));
  runtime.onEvent(subject, event('turn/start', { turn: 2 }, 300));
  runtime.onEvent(subject, user('and one detail'));
  runtime.onEvent(subject, assistant(2, 'second reply'));
  runtime.onEvent(subject, event('turn/end', { turn: 2, reason: { kind: 'completed' } }, 500));
  await runtime.drain();
  assert.deepEqual(sent.map((payload) => [payload.turn_id, payload.user_prompt, payload.last_assistant_message]), [
    [1, 'first prompt', 'first reply'], [2, 'second prompt\n\nand one detail', 'second reply'],
  ]);
});

test('DeepSeek runtime isolates parallel sessions and subsequent turns at the same cwd', async () => {
  const sent = [];
  const runtime = createDeepseekRuntime({ send: async (payload) => sent.push(payload) });
  const a = session('a');
  const b = session('b');
  complete(runtime, a, 1, 'same reply');
  complete(runtime, b, 1, 'same reply');
  complete(runtime, a, 2, 'same reply');
  runtime.onEvent(a, event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 3000));
  await runtime.drain();
  assert.deepEqual(sent.map((payload) => [payload.session_id, payload.turn_id]), [['a', 1], ['b', 1], ['a', 2]]);
});

test('DeepSeek runtime excludes subagents, automatic rounds, and unsuccessful outcomes', async () => {
  const sent = [];
  const runtime = createDeepseekRuntime({ send: (payload) => sent.push(payload) });
  complete(runtime, session('child', { origin: 'subagent', parentSession: 'main' }), 1);
  for (const kind of ['goal', 'schedule']) {
    const subject = session(kind);
    runtime.onEvent(subject, event('turn/start', { turn: 1 }));
    runtime.onEvent(subject, user('automatic round', kind));
    runtime.onEvent(subject, assistant(1, 'automatic reply'));
    runtime.onEvent(subject, event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 2000));
  }
  for (const kind of ['aborted', 'blocked', 'error', 'max-tokens', 'interrupted', 'forked']) {
    complete(runtime, session(kind), 1, 'partial reply', kind);
  }
  const synthetic = session('synthetic');
  runtime.onEvent(synthetic, event('turn/start', { turn: 1 }));
  runtime.onEvent(synthetic, user('injected context', 'my-plugin'));
  runtime.onEvent(synthetic, assistant(1, 'context reply'));
  runtime.onEvent(synthetic, event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 2000));
  complete(runtime, session('ordinary-fork', { parentSession: 'historic-fork-parent' }), 1, 'user fork reply');
  await runtime.drain();
  assert.deepEqual(sent.map((payload) => payload.session_id), ['ordinary-fork']);
});

test('DeepSeek runtime keeps an active or paused goal from becoming a completion alert', async () => {
  for (const phase of ['active', 'paused']) {
    const sent = [];
    const runtime = createDeepseekRuntime({ send: (payload) => sent.push(payload), getGoal: () => ({ phase }) });
    complete(runtime, session(phase), 1);
    await runtime.drain();
    assert.equal(sent.length, 0);
  }
});

test('DeepSeek runtime contains transport errors and ignores disposed or incomplete turns', async () => {
  let attempts = 0;
  const runtime = createDeepseekRuntime({ send: () => { attempts += 1; throw new Error('transport unavailable'); } });
  const subject = session('failure');
  assert.doesNotThrow(() => complete(runtime, subject, 1));
  await assert.doesNotReject(runtime.drain());
  runtime.onEvent(subject, event('turn/end', { turn: 1, reason: { kind: 'completed' } }, 2000));
  runtime.onDispose(subject);
  runtime.onEvent(subject, event('turn/end', { turn: 2, reason: { kind: 'completed' } }, 3000));
  await runtime.dispose();
  complete(runtime, session('disposed'), 1);
  assert.equal(attempts, 1);
});

function fakeChild() {
  const child = new EventEmitter();
  child.stdin = new EventEmitter();
  child.stdin.end = (value) => { child.input = value; };
  child.kill = (signal) => { child.killed = signal; };
  return child;
}

test('DeepSeek transport uses argv and stdin JSON while ignoring both output streams', async () => {
  const child = fakeChild();
  let invocation;
  const transport = createDeepseekTransport({
    command: '/absolute/reminder', args: ['notify', '--source', 'deepseek', '--from-hook'], env: { TEST: 'isolated' },
    spawnProcess: (...args) => { invocation = args; return child; },
  });
  const result = transport.send({ last_assistant_message: 'quotes " and \n text' });
  assert.deepEqual(invocation, ['/absolute/reminder', ['notify', '--source', 'deepseek', '--from-hook'], {
    stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true, env: { TEST: 'isolated' },
  }]);
  assert.deepEqual(JSON.parse(child.input), { last_assistant_message: 'quotes " and \n text' });
  child.emit('close', 0);
  assert.equal(await result, true);
});

test('DeepSeek transport contains spawn, process, and stdin failures', async () => {
  const throwing = createDeepseekTransport({ spawnProcess: () => { throw new Error('spawn failed'); } });
  assert.equal(await throwing.send({}), false);
  for (const failure of ['process', 'stdin']) {
    const child = fakeChild();
    const transport = createDeepseekTransport({ spawnProcess: () => child });
    const result = transport.send({});
    (failure === 'stdin' ? child.stdin : child).emit('error', new Error('failed'));
    assert.equal(await result, false);
    if (failure === 'stdin') assert.equal(child.killed, 'SIGKILL', 'a broken stdin must not leave an untracked child');
  }
});

test('DeepSeek transport bounds hangs and cancels children when the plugin unloads', async () => {
  const timedOut = fakeChild();
  const transport = createDeepseekTransport({ spawnProcess: () => timedOut, timeoutMs: 5 });
  const [result] = await Promise.all([transport.send({}), new Promise((resolve) => setTimeout(resolve, 15))]);
  assert.equal(result, false);
  assert.equal(timedOut.killed, 'SIGKILL');
  const cancelled = fakeChild();
  const unloading = createDeepseekTransport({ spawnProcess: () => cancelled });
  const pending = unloading.send({});
  unloading.dispose();
  assert.equal(await pending, false);
  assert.equal(cancelled.killed, 'SIGKILL');
  assert.equal(await unloading.send({}), false);
});

test('generated DeepSeek native module loads as ESM and registers the official event observer', async () => {
  const source = buildDeepseekPlugin('/workspace/ai-reminder.js');
  const plugin = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const listeners = new Map();
  let dispose;
  plugin.apply({
    workingDirectory: { get: () => '/workspace' },
    get: () => undefined,
    on: (name, listener) => listeners.set(name, listener),
    effect: (register) => { dispose = register(); },
  });
  assert.deepEqual(plugin.inject, ['workingDirectory']);
  assert.equal(typeof listeners.get('session/event'), 'function');
  assert.equal(typeof listeners.get('session/disposed'), 'function');
  await dispose();
});
