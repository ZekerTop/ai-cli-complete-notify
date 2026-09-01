const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, { timeoutMs = 3000, intervalMs = 25 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  assert.ok(predicate(), 'condition was not reached before timeout');
}

function appendJsonl(filePath, entries) {
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
  fs.appendFileSync(filePath, content, 'utf8');
}

test('codex watch treats sessions without subagent metadata independently', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '04', '28');
  fs.mkdirSync(sessionDir, { recursive: true });
  const parentFile = path.join(sessionDir, 'parent.jsonl');
  const childOneFile = path.join(sessionDir, 'child-one.jsonl');
  const childTwoFile = path.join(sessionDir, 'child-two.jsonl');
  for (const filePath of [parentFile, childOneFile, childTwoFile]) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(parentFile, [
    { timestamp: 1, type: 'event_msg', payload: { type: 'task_started', turn_id: 'parent-turn' } },
  ]);
  await sleep(650);

  appendJsonl(childOneFile, [
    { timestamp: 2, type: 'event_msg', payload: { type: 'task_started', turn_id: 'child-turn-1' } },
    { timestamp: 3, type: 'event_msg', payload: { type: 'agent_message', content: 'child one done' } },
    { timestamp: 4, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'child-turn-1', last_agent_message: 'child one done' } },
  ]);
  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].outputContent, 'child one done');

  appendJsonl(childTwoFile, [
    { timestamp: 5, type: 'event_msg', payload: { type: 'task_started', turn_id: 'child-turn-2' } },
    { timestamp: 6, type: 'event_msg', payload: { type: 'agent_message', content: 'child two done' } },
    { timestamp: 7, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'child-turn-2', last_agent_message: 'child two done' } },
  ]);
  await waitFor(() => notifications.length === 2);
  assert.equal(notifications[1].outputContent, 'child two done');

  appendJsonl(parentFile, [
    { timestamp: 8, type: 'event_msg', payload: { type: 'agent_message', content: 'parent done' } },
    { timestamp: 9, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'parent-turn', last_agent_message: 'parent done' } },
  ]);

  await waitFor(() => notifications.length === 3);
  assert.equal(notifications[2].source, 'codex');
  assert.equal(notifications[2].outputContent, 'parent done');
});

test('codex watch reads task_complete content when last_agent_message is missing', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '06', '02');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 'content-complete.jsonl');
  fs.writeFileSync(sessionFile, '', 'utf8');

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(sessionFile, [
    { timestamp: 1, type: 'event_msg', payload: { type: 'task_started', turn_id: 'content-turn' } },
    {
      timestamp: 2,
      type: 'event_msg',
      payload: {
        type: 'task_complete',
        turn_id: 'content-turn',
        content: [{ type: 'output_text', text: 'fallback complete output' }],
      },
    },
  ]);

  await waitFor(() => notifications.length === 1, { timeoutMs: 1500, intervalMs: 25 });
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].outputContent, 'fallback complete output');
  assert.ok(
    logs.some((line) => line.includes('sent: 1/1') && line.includes('task_complete')),
    `expected task_complete notification log, got:\n${logs.join('\n')}`
  );
});

test('codex watch only notifies after an active goal stops', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-goal-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_FINAL_ANSWER_QUIET_MS: process.env.CODEX_FINAL_ANSWER_QUIET_MS,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_FINAL_ANSWER_QUIET_MS = '300';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '08', '03');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 'goal-session.jsonl');
  fs.writeFileSync(sessionFile, '', 'utf8');

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(sessionFile, [
    { timestamp: 1, type: 'event_msg', payload: { type: 'task_started', turn_id: 'goal-turn' } },
    {
      timestamp: 2,
      type: 'event_msg',
      payload: {
        type: 'thread_goal_updated',
        threadId: 'goal-session',
        turnId: 'goal-turn',
        goal: { status: 'active' },
      },
    },
    {
      timestamp: 3,
      type: 'response_item',
      payload: { type: 'message', role: 'assistant', phase: 'final_answer', content: 'Goal 中间进度' },
    },
  ]);

  await sleep(650);
  assert.equal(notifications.length, 0, `active goal fallback should not notify:\n${logs.join('\n')}`);

  appendJsonl(sessionFile, [
    {
      timestamp: 4,
      type: 'event_msg',
      payload: { type: 'task_complete', turn_id: 'goal-turn', last_agent_message: 'Goal 中间轮次结束' },
    },
  ]);
  await sleep(650);
  assert.equal(notifications.length, 0, `active goal task_complete should not notify:\n${logs.join('\n')}`);

  appendJsonl(sessionFile, [
    {
      timestamp: 5,
      type: 'event_msg',
      payload: {
        type: 'thread_goal_updated',
        threadId: 'goal-session',
        turnId: 'goal-turn',
        goal: { status: 'complete' },
      },
    },
    {
      timestamp: 6,
      type: 'event_msg',
      payload: { type: 'task_complete', turn_id: 'goal-turn', last_agent_message: 'Goal 最终完成' },
    },
  ]);

  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].outputContent, 'Goal 最终完成');

  appendJsonl(sessionFile, [
    { timestamp: 7, type: 'event_msg', payload: { type: 'task_started', turn_id: 'paused-turn' } },
    {
      timestamp: 8,
      type: 'event_msg',
      payload: {
        type: 'thread_goal_updated',
        threadId: 'goal-session',
        turnId: 'paused-turn',
        goal: { status: 'paused' },
      },
    },
    {
      timestamp: 9,
      type: 'event_msg',
      payload: { type: 'task_complete', turn_id: 'paused-turn', last_agent_message: 'Goal 已暂停' },
    },
  ]);
  await sleep(650);
  assert.equal(notifications.length, 1, `paused goal should not notify:\n${logs.join('\n')}`);

  appendJsonl(sessionFile, [
    { timestamp: 10, type: 'event_msg', payload: { type: 'task_started', turn_id: 'normal-turn' } },
    {
      timestamp: 11,
      type: 'event_msg',
      payload: { type: 'task_complete', turn_id: 'normal-turn', last_agent_message: '普通任务完成' },
    },
  ]);

  await waitFor(() => notifications.length === 2);
  assert.equal(notifications[1].outputContent, '普通任务完成');

  appendJsonl(sessionFile, [
    { timestamp: 12, type: 'event_msg', payload: { type: 'task_started', turn_id: 'blocked-turn' } },
    {
      timestamp: 13,
      type: 'event_msg',
      payload: {
        type: 'thread_goal_updated',
        threadId: 'goal-session',
        turnId: 'blocked-turn',
        goal: { status: 'active' },
      },
    },
    {
      timestamp: 14,
      type: 'event_msg',
      payload: {
        type: 'thread_goal_updated',
        threadId: 'goal-session',
        turnId: 'blocked-turn',
        goal: { status: 'blocked' },
      },
    },
    {
      timestamp: 15,
      type: 'event_msg',
      payload: { type: 'task_complete', turn_id: 'blocked-turn', last_agent_message: 'Goal 已阻塞' },
    },
  ]);

  await waitFor(() => notifications.length === 3);
  assert.equal(notifications[2].outputContent, 'Goal 已阻塞');
});

test('codex watch suppresses Codex Desktop subagent completions from session metadata', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '04', '28');
  fs.mkdirSync(sessionDir, { recursive: true });
  const parentFile = path.join(sessionDir, 'parent.jsonl');
  const childFile = path.join(sessionDir, 'child.jsonl');
  for (const filePath of [parentFile, childFile]) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(parentFile, [
    {
      timestamp: 1,
      type: 'session_meta',
      payload: {
        id: 'parent-thread',
        cwd: '/workspace/app',
        originator: 'Codex Desktop',
        source: 'vscode',
      },
    },
  ]);

  appendJsonl(childFile, [
    {
      timestamp: 2,
      type: 'session_meta',
      payload: {
        id: 'child-thread',
        cwd: '/workspace/app',
        originator: 'Codex Desktop',
        thread_source: 'subagent',
        source: {
          subagent: {
            thread_spawn: {
              parent_thread_id: 'parent-thread',
              depth: 1,
              agent_nickname: 'Euler',
              agent_role: 'explorer',
            },
          },
        },
        agent_nickname: 'Euler',
        agent_role: 'explorer',
      },
    },
    { timestamp: 3, type: 'event_msg', payload: { type: 'task_started', turn_id: 'child-turn' } },
    { timestamp: 4, type: 'event_msg', payload: { type: 'agent_message', content: 'child done' } },
    { timestamp: 5, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'child-turn', last_agent_message: 'child done' } },
  ]);

  await sleep(650);
  assert.equal(notifications.length, 0, `subagent completion should not notify:\n${logs.join('\n')}`);

  appendJsonl(parentFile, [
    { timestamp: 6, type: 'event_msg', payload: { type: 'task_started', turn_id: 'parent-turn' } },
    { timestamp: 7, type: 'event_msg', payload: { type: 'agent_message', content: 'parent done' } },
    { timestamp: 8, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'parent-turn', last_agent_message: 'parent done' } },
  ]);

  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].cwd, '/workspace/app');
  assert.equal(notifications[0].outputContent, 'parent done');
});

test('codex watch loads subagent metadata from the file head when tail seed misses it', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '04', '28');
  fs.mkdirSync(sessionDir, { recursive: true });
  const parentFile = path.join(sessionDir, 'parent.jsonl');
  const childFile = path.join(sessionDir, 'large-child.jsonl');
  fs.writeFileSync(parentFile, '', 'utf8');

  const childMeta = {
    timestamp: 1,
    type: 'session_meta',
    payload: {
      id: 'large-child-thread',
      cwd: '/workspace/app',
      originator: 'Codex Desktop',
      thread_source: 'subagent',
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: 'parent-thread',
            depth: 1,
            agent_nickname: 'Noether',
            agent_role: 'worker',
          },
        },
      },
      agent_nickname: 'Noether',
      agent_role: 'worker',
    },
  };
  const filler = Array.from({ length: 5000 }, (_, index) => JSON.stringify({
    timestamp: 10 + index,
    type: 'event_msg',
    payload: { type: 'token_count' },
  })).join('\n');
  fs.writeFileSync(childFile, `${JSON.stringify(childMeta)}\n${filler}\n`, 'utf8');

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(childFile, [
    { timestamp: 6000, type: 'event_msg', payload: { type: 'task_started', turn_id: 'child-turn' } },
    { timestamp: 6001, type: 'event_msg', payload: { type: 'agent_message', content: 'large child done' } },
    { timestamp: 6002, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'child-turn', last_agent_message: 'large child done' } },
  ]);

  await sleep(650);
  assert.equal(notifications.length, 0, `large subagent completion should not notify:\n${logs.join('\n')}`);

  appendJsonl(parentFile, [
    {
      timestamp: 6003,
      type: 'session_meta',
      payload: {
        id: 'parent-thread',
        cwd: '/workspace/app',
        originator: 'Codex Desktop',
        source: 'vscode',
      },
    },
    { timestamp: 6004, type: 'event_msg', payload: { type: 'task_started', turn_id: 'parent-turn' } },
    { timestamp: 6005, type: 'event_msg', payload: { type: 'agent_message', content: 'parent done' } },
    { timestamp: 6006, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'parent-turn', last_agent_message: 'parent done' } },
  ]);

  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].cwd, '/workspace/app');
  assert.equal(notifications[0].outputContent, 'parent done');
});

test('codex watch does not block a same-cwd session completion when another session stays active', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '04', '28');
  fs.mkdirSync(sessionDir, { recursive: true });
  const activeFile = path.join(sessionDir, 'active.jsonl');
  const shortFile = path.join(sessionDir, 'short.jsonl');
  for (const filePath of [activeFile, shortFile]) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(650);

  appendJsonl(activeFile, [
    { timestamp: 1, type: 'turn_context', payload: { cwd: '/workspace/app' } },
    { timestamp: 2, type: 'event_msg', payload: { type: 'task_started', turn_id: 'leader-turn' } },
  ]);
  await sleep(650);

  appendJsonl(shortFile, [
    { timestamp: 3, type: 'turn_context', payload: { cwd: '/workspace/app' } },
    { timestamp: 4, type: 'event_msg', payload: { type: 'task_started', turn_id: 'short-turn' } },
    { timestamp: 5, type: 'event_msg', payload: { type: 'agent_message', content: 'hello done' } },
    { timestamp: 6, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'short-turn', last_agent_message: 'hello done' } },
  ]);

  await waitFor(() => notifications.length === 1, { timeoutMs: 1500, intervalMs: 25 });
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].outputContent, 'hello done');
  assert.ok(
    logs.some((line) => line.includes('sent: 1/1') && line.includes('task_complete')),
    `expected notification log, got:\n${logs.join('\n')}`
  );
});

test('codex watch notifies only the new fork turn added between attach and seed priming', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-fork-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '60000';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '05', '14');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sourceFile = path.join(sessionDir, 'rollout-source-thread.jsonl');
  const forkFile = path.join(sessionDir, 'fork.jsonl');

  const sourceAt = Date.now() - 120000;
  appendJsonl(sourceFile, [
    {
      timestamp: sourceAt,
      type: 'session_meta',
      payload: {
        id: 'source-thread',
        cwd: '/workspace/original',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
      },
    },
    { timestamp: sourceAt + 100, type: 'event_msg', payload: { type: 'task_started', turn_id: 'old-turn-1' } },
    { timestamp: sourceAt + 200, type: 'event_msg', payload: { type: 'agent_message', content: 'old one done' } },
    { timestamp: sourceAt + 300, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'old-turn-1', last_agent_message: 'old one done' } },
    { timestamp: sourceAt + 400, type: 'event_msg', payload: { type: 'task_started', turn_id: 'old-turn-2' } },
    { timestamp: sourceAt + 500, type: 'event_msg', payload: { type: 'agent_message', content: 'old two done' } },
    { timestamp: sourceAt + 600, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'old-turn-2', last_agent_message: 'old two done' } },
  ]);

  fs.writeFileSync(forkFile, '', 'utf8');
  await sleep(20);
  const copiedAt = Date.now();

  appendJsonl(forkFile, [
    {
      timestamp: copiedAt,
      type: 'session_meta',
      payload: {
        id: 'fork-thread',
        cwd: '/workspace/fork-worktree',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
        forked_from_id: 'source-thread',
      },
    },
  ]);

  const forkPayload = [
    {
      timestamp: copiedAt,
      type: 'session_meta',
      payload: {
        id: 'source-thread',
        cwd: '/workspace/original',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
      },
    },
    { timestamp: copiedAt, type: 'event_msg', payload: { type: 'task_started', turn_id: 'old-turn-1' } },
    { timestamp: copiedAt + 100, type: 'event_msg', payload: { type: 'agent_message', content: 'old one done' } },
    { timestamp: copiedAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'old-turn-1', last_agent_message: 'old one done' } },
    { timestamp: copiedAt + 300, type: 'event_msg', payload: { type: 'task_started', turn_id: 'old-turn-2' } },
    { timestamp: copiedAt + 400, type: 'event_msg', payload: { type: 'agent_message', content: 'old two done' } },
    { timestamp: copiedAt + 500, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'old-turn-2', last_agent_message: 'old two done' } },
    {
      timestamp: copiedAt + 600,
      type: 'event_msg',
      payload: { type: 'thread_settings_applied', thread_id: 'fork-thread' },
    },
    {
      timestamp: copiedAt + 700,
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'continue from this fork' }],
      },
    },
    { timestamp: copiedAt + 800, type: 'event_msg', payload: { type: 'task_started', turn_id: 'new-branch-turn' } },
    { timestamp: copiedAt + 900, type: 'event_msg', payload: { type: 'agent_message', content: 'new branch done' } },
    { timestamp: copiedAt + 1000, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'new-branch-turn', last_agent_message: 'new branch done' } },
  ];

  const logs = [];
  let appendedDuringAttach = false;
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => {
      logs.push(line);
      if (!appendedDuringAttach && line.includes(`following ${forkFile}`)) {
        appendedDuringAttach = true;
        appendJsonl(forkFile, forkPayload);
      }
    },
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await waitFor(() => notifications.length >= 1);
  await sleep(650);
  assert.equal(notifications.length, 1, `attach/seed catchup should notify only the new branch turn:\n${logs.join('\n')}`);
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].cwd, '/workspace/fork-worktree');
  assert.equal(notifications[0].outputContent, 'new branch done');
});

test('codex watch ignores fork history appended in batches after attach', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-live-fork-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '60000';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '09', '01');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sourceFile = path.join(sessionDir, 'rollout-source-live-thread.jsonl');
  const forkFile = path.join(sessionDir, 'fork-live-copy.jsonl');
  const sourceAt = Date.now() - 120000;
  appendJsonl(sourceFile, [
    { timestamp: sourceAt, type: 'session_meta', payload: { id: 'source-live-thread', cwd: '/workspace/original' } },
    { timestamp: sourceAt + 100, type: 'event_msg', payload: { type: 'task_started', turn_id: 'copied-turn-1' } },
    { timestamp: sourceAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'copied-turn-1', last_agent_message: 'copied one done' } },
    { timestamp: sourceAt + 300, type: 'event_msg', payload: { type: 'task_started', turn_id: 'copied-turn-2' } },
    { timestamp: sourceAt + 400, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'copied-turn-2', last_agent_message: 'copied two done' } },
  ]);
  appendJsonl(forkFile, [
    {
      timestamp: Date.now(),
      type: 'session_meta',
      payload: {
        id: 'fork-live-thread',
        cwd: '/workspace/fork-worktree',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
        forked_from_id: 'source-live-thread',
      },
    },
  ]);

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await waitFor(() => logs.some((line) => line.includes(`following ${forkFile}`)));

  const firstBatchAt = Date.now();
  appendJsonl(forkFile, [
    {
      timestamp: firstBatchAt,
      type: 'session_meta',
      payload: {
        id: 'source-live-thread',
        cwd: '/workspace/original',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
      },
    },
    { timestamp: firstBatchAt, type: 'event_msg', payload: { type: 'task_started', turn_id: 'copied-turn-1' } },
    { timestamp: firstBatchAt + 100, type: 'event_msg', payload: { type: 'agent_message', content: 'copied one done' } },
    { timestamp: firstBatchAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'copied-turn-1', last_agent_message: 'copied one done' } },
  ]);
  await sleep(1300);

  const secondBatchAt = Date.now();
  appendJsonl(forkFile, [
    { timestamp: secondBatchAt, type: 'event_msg', payload: { type: 'task_started', turn_id: 'copied-turn-2' } },
    { timestamp: secondBatchAt + 100, type: 'event_msg', payload: { type: 'agent_message', content: 'copied two done' } },
    { timestamp: secondBatchAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'copied-turn-2', last_agent_message: 'copied two done' } },
  ]);
  await sleep(650);

  assert.equal(notifications.length, 0, `fork history appended after attach should not notify:\n${logs.join('\n')}`);

  appendJsonl(forkFile, [
    {
      timestamp: Date.now(),
      type: 'event_msg',
      payload: { type: 'thread_settings_applied', thread_id: 'fork-live-thread' },
    },
  ]);
  await sleep(650);
  assert.equal(notifications.length, 0, `fork boundary should not notify before a new user message:\n${logs.join('\n')}`);

  const newTurnAt = Date.now();
  appendJsonl(forkFile, [
    {
      timestamp: newTurnAt,
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'start the new fork turn' }],
      },
    },
    { timestamp: newTurnAt + 100, type: 'event_msg', payload: { type: 'task_started', turn_id: 'fork-live-new-turn' } },
    { timestamp: newTurnAt + 200, type: 'event_msg', payload: { type: 'agent_message', content: 'live fork done' } },
    { timestamp: newTurnAt + 300, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'fork-live-new-turn', last_agent_message: 'live fork done' } },
  ]);

  await waitFor(() => notifications.length === 1);
  await sleep(650);
  assert.equal(notifications.length, 1, `new turn after fork boundary should notify exactly once:\n${logs.join('\n')}`);
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].cwd, '/workspace/fork-worktree');
  assert.equal(notifications[0].outputContent, 'live fork done');
});

test('codex watch detects the first new fork turn when thread_settings_applied is missing', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-quiet-fork-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '60000';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '09', '01');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sourceFile = path.join(sessionDir, 'rollout-source-without-settings-thread.jsonl');
  const forkFile = path.join(sessionDir, 'fork-without-settings.jsonl');
  const sourceAt = Date.now() - 120000;
  appendJsonl(sourceFile, [
    { timestamp: sourceAt, type: 'session_meta', payload: { id: 'source-without-settings-thread', cwd: '/workspace/original' } },
    { timestamp: sourceAt + 100, type: 'event_msg', payload: { type: 'task_started', turn_id: 'quiet-copied-turn-1' } },
    { timestamp: sourceAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'quiet-copied-turn-1', last_agent_message: 'quiet copied one done' } },
    { timestamp: sourceAt + 300, type: 'event_msg', payload: { type: 'task_started', turn_id: 'quiet-copied-turn-2' } },
    { timestamp: sourceAt + 400, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'quiet-copied-turn-2', last_agent_message: 'quiet copied two done' } },
  ]);
  appendJsonl(forkFile, [
    {
      timestamp: Date.now(),
      type: 'session_meta',
      payload: {
        id: 'fork-without-settings-thread',
        cwd: '/workspace/fork-without-settings',
        originator: 'Codex Desktop',
        source: 'vscode',
        thread_source: 'user',
        forked_from_id: 'source-without-settings-thread',
      },
    },
  ]);

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await waitFor(() => logs.some((line) => line.includes(`following ${forkFile}`)));

  const copiedAt = Date.now();
  appendJsonl(forkFile, [
    { timestamp: copiedAt, type: 'event_msg', payload: { type: 'task_started', turn_id: 'quiet-copied-turn-1' } },
    { timestamp: copiedAt + 100, type: 'event_msg', payload: { type: 'agent_message', content: 'quiet copied one done' } },
    { timestamp: copiedAt + 200, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'quiet-copied-turn-1', last_agent_message: 'quiet copied one done' } },
    { timestamp: copiedAt + 300, type: 'event_msg', payload: { type: 'task_started', turn_id: 'quiet-copied-turn-2' } },
    { timestamp: copiedAt + 400, type: 'event_msg', payload: { type: 'agent_message', content: 'quiet copied two done' } },
    { timestamp: copiedAt + 500, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'quiet-copied-turn-2', last_agent_message: 'quiet copied two done' } },
    {
      timestamp: copiedAt + 600,
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'start after the inherited fork copy' }],
      },
    },
    { timestamp: copiedAt + 700, type: 'event_msg', payload: { type: 'task_started', turn_id: 'quiet-fork-new-turn' } },
    { timestamp: copiedAt + 800, type: 'event_msg', payload: { type: 'agent_message', content: 'quiet fork done' } },
    { timestamp: copiedAt + 900, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'quiet-fork-new-turn', last_agent_message: 'quiet fork done' } },
  ]);

  await waitFor(() => notifications.length === 1);
  await sleep(650);
  assert.equal(notifications.length, 1, `first new fork turn should notify exactly once:\n${logs.join('\n')}`);
  assert.equal(notifications[0].source, 'codex');
  assert.equal(notifications[0].cwd, '/workspace/fork-without-settings');
  assert.equal(notifications[0].outputContent, 'quiet fork done');
});

test('codex watch only uses explicit request_user_input for confirm alerts', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-reminder-codex-confirm-home-'));
  const previousEnv = {
    CODEX_WATCH_BACKEND: process.env.CODEX_WATCH_BACKEND,
    CODEX_FOLLOW_TOP_N: process.env.CODEX_FOLLOW_TOP_N,
    CODEX_SEED_CATCHUP_MS: process.env.CODEX_SEED_CATCHUP_MS,
    CODEX_STRICT_FINAL_ANSWER: process.env.CODEX_STRICT_FINAL_ANSWER,
    CODEX_TUI_LOG_PATH: process.env.CODEX_TUI_LOG_PATH,
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

  process.env.CODEX_WATCH_BACKEND = 'sessions';
  process.env.CODEX_FOLLOW_TOP_N = '5';
  process.env.CODEX_SEED_CATCHUP_MS = '0';
  process.env.CODEX_STRICT_FINAL_ANSWER = '1';
  process.env.CODEX_TUI_LOG_PATH = path.join(tempHome, 'missing-codex-tui.log');
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

  const sessionDir = path.join(tempHome, '.codex', 'sessions', '2026', '08', '03');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 'session.jsonl');
  fs.writeFileSync(sessionFile, '', 'utf8');

  const logs = [];
  const stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: true },
  });
  t.after(() => stop());

  await sleep(650);

  const completionText = '修改已完成。是否需要我继续测试？';
  appendJsonl(sessionFile, [
    { timestamp: 1, type: 'turn_context', payload: { cwd: '/workspace/app' } },
    { timestamp: 2, type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-complete' } },
    { timestamp: 3, type: 'event_msg', payload: { type: 'agent_message', content: completionText } },
    { timestamp: 4, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'turn-complete', last_agent_message: completionText } },
  ]);

  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].taskInfo, 'Codex 完成');
  assert.equal(notifications[0].notifyKind, undefined);
  assert.equal(notifications[0].outputContent, completionText);

  appendJsonl(sessionFile, [
    { timestamp: 5, type: 'event_msg', payload: { type: 'task_started', turn_id: 'turn-confirm' } },
    {
      timestamp: 6,
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'request_user_input',
        call_id: 'confirm-call',
        arguments: JSON.stringify({ question: '请选择下一步' }),
      },
    },
  ]);

  await waitFor(() => notifications.length === 2);
  assert.equal(notifications[1].taskInfo, '确认提醒');
  assert.equal(notifications[1].notifyKind, 'confirm');

  appendJsonl(sessionFile, [
    { timestamp: 7, type: 'event_msg', payload: { type: 'task_complete', turn_id: 'turn-confirm', last_agent_message: '请选择下一步' } },
  ]);
  await sleep(650);

  assert.equal(notifications.length, 2, `unexpected notification after request_user_input task_complete:\n${logs.join('\n')}`);
  assert.ok(
    logs.some((line) => line.includes('skipped completion (task_complete: interaction required)')),
    `expected interaction-required skip log, got:\n${logs.join('\n')}`
  );
});
