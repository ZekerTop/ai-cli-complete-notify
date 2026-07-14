const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, { timeoutMs = 4000, intervalMs = 40 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  assert.ok(predicate(), 'condition was not reached before timeout');
}

function writeSession(filePath, messages) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ messages }), 'utf8');
  // Ensure mtime advances so watch tick notices the rewrite.
  const now = Date.now() / 1000;
  fs.utimesSync(filePath, now, now);
}

test('gemini watch clears lastGeminiContent on new user turn', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-gemini-home-'));
  const previousEnv = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
  };

  const notifications = [];
  const enginePath = require.resolve('../src/engine');
  const watchPath = require.resolve('../src/watch');
  const originalEngineCache = require.cache[enginePath];
  const originalWatchCache = require.cache[watchPath];

  function restore() {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalEngineCache) require.cache[enginePath] = originalEngineCache;
    else delete require.cache[enginePath];
    if (originalWatchCache) require.cache[watchPath] = originalWatchCache;
    else delete require.cache[watchPath];
    fs.rmSync(tempHome, { recursive: true, force: true });
  }

  t.after(restore);

  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;

  require.cache[enginePath] = {
    id: enginePath,
    filename: enginePath,
    loaded: true,
    exports: {
      sendNotifications: async (args) => {
        notifications.push(args);
        return { results: [{ ok: true }] };
      },
    },
  };
  delete require.cache[watchPath];
  const { startWatch } = require('../src/watch');

  const chatDir = path.join(tempHome, '.gemini', 'tmp', 'project', 'chats');
  const sessionA = path.join(chatDir, 'session-a.json');
  const t0 = Date.now() - 60_000;

  // Seed only the user turn so watch attaches without marking a completion.
  writeSession(sessionA, [
    { type: 'user', timestamp: t0, text: 'first question' },
  ]);

  const stop = startWatch({
    sources: 'gemini',
    intervalMs: 60,
    geminiQuietMs: 80,
    log: false,
    confirmAlert: false,
  });
  t.after(() => {
    try { stop(); } catch (_error) { /* ignore */ }
  });

  // Allow the watcher to attach to session-a.
  await sleep(250);

  writeSession(sessionA, [
    { type: 'user', timestamp: t0, text: 'first question' },
    { type: 'gemini', timestamp: Date.now(), text: 'first answer' },
  ]);

  await waitFor(() => notifications.length >= 1, { timeoutMs: 5000 });
  assert.equal(notifications[0].outputContent, 'first answer');
  assert.match(String(notifications[0].dedupeKey || ''), /session-a\.json/i);
  assert.match(String(notifications[0].dedupeKey || ''), /first answer/i);

  // New user turn with no assistant reply yet must not reuse first-answer content.
  writeSession(sessionA, [
    { type: 'user', timestamp: t0, text: 'first question' },
    { type: 'gemini', timestamp: t0 + 1000, text: 'first answer' },
    { type: 'user', timestamp: Date.now(), text: 'second question' },
  ]);

  const afterUserCount = notifications.length;
  await sleep(700);
  assert.equal(
    notifications.length,
    afterUserCount,
    'new user turn without assistant output should not notify with stale content',
  );

  // Completing the second turn should notify with second-answer only.
  writeSession(sessionA, [
    { type: 'user', timestamp: t0, text: 'first question' },
    { type: 'gemini', timestamp: t0 + 1000, text: 'first answer' },
    { type: 'user', timestamp: Date.now() - 1000, text: 'second question' },
    { type: 'gemini', timestamp: Date.now(), text: 'second answer' },
  ]);

  await waitFor(() => notifications.length >= afterUserCount + 1, { timeoutMs: 5000 });
  const second = notifications[notifications.length - 1];
  assert.equal(second.outputContent, 'second answer');
  assert.doesNotMatch(String(second.outputContent || ''), /first answer/i);
  assert.match(String(second.dedupeKey || ''), /second answer/i);
  // Same session keeps the same scope segment even when output changes.
  assert.match(String(second.dedupeKey || ''), /session-a\.json/i);
});

test('gemini watch source clears lastGeminiContent on file switch and user turn', () => {
  const watchSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'watch.js'), 'utf8');
  assert.match(watchSource, /state\.lastGeminiContent = null;/);
  // Ensure both turn-boundary sites clear content, not only declaration.
  const resets = watchSource.match(/state\.lastGeminiContent = null;/g) || [];
  assert.ok(resets.length >= 3, `expected multiple lastGeminiContent resets, found ${resets.length}`);
  assert.match(watchSource, /New user turn: drop previous completion content/);
  assert.match(watchSource, /Never carry output from a previous session/);
  // Watch dedupe key is session-scoped via currentFile.
  assert.match(watchSource, /currentFile:\s*state\.currentFile/);
});
