const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(25);
  }
  assert.ok(predicate(), 'watch did not process the expected records');
}

async function startIsolatedWatch(t) {
  const target = path.join(__dirname, '..', 'src-tauri', 'target');
  fs.mkdirSync(target, { recursive: true });
  const tempHome = fs.mkdtempSync(path.join(target, 'codex-async-lifecycle-'));
  const env = {
    HOME: tempHome,
    USERPROFILE: tempHome,
    CODEX_WATCH_BACKEND: 'sessions',
    CODEX_FOLLOW_TOP_N: '5',
    CODEX_SEED_CATCHUP_MS: '0',
    CODEX_STRICT_FINAL_ANSWER: '1',
    CODEX_TUI_LOG_PATH: path.join(tempHome, 'missing-tui.log'),
  };
  const previousEnv = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  const enginePath = require.resolve('../src/engine');
  const watchPath = require.resolve('../src/watch');
  const previousEngine = require.cache[enginePath];
  const previousWatch = require.cache[watchPath];
  const notifications = [];
  const logs = [];
  let stop;
  t.after(() => {
    if (stop) stop();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (previousEngine) require.cache[enginePath] = previousEngine;
    else delete require.cache[enginePath];
    if (previousWatch) require.cache[watchPath] = previousWatch;
    else delete require.cache[watchPath];
    fs.rmSync(tempHome, { recursive: true, force: true });
  });
  Object.assign(process.env, env);
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
  const sessionDir = path.join(tempHome, '.codex', 'sessions');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 'async-session.jsonl');
  fs.writeFileSync(sessionFile, '', 'utf8');
  stop = startWatch({
    sources: ['codex'],
    intervalMs: 50,
    confirmAlert: { enabled: true },
    log: (line) => logs.push(line),
  });
  await sleep(650);
  let timestamp = Date.now();
  return {
    notifications,
    logs,
    append(entries) {
      const content = entries.map((entry) => JSON.stringify({ timestamp: timestamp++, ...entry })).join('\n');
      fs.appendFileSync(sessionFile, `${content}\n`, 'utf8');
    },
  };
}

const resumeEvents = [
  ['user response item', { type: 'response_item', payload: { type: 'message', role: 'user', content: '继续' } }],
  ['user event', { type: 'event_msg', payload: { type: 'user_message', message: '继续' } }],
  ['new turn context', { type: 'turn_context', payload: { turn_id: 'answered-turn' } }],
  ['new task started', { type: 'event_msg', payload: { type: 'task_started', turn_id: 'answered-turn' } }],
];

for (const [index, [resumeName, resumeEvent]] of resumeEvents.entries()) {
  test(`codex async ACK keeps the question pending until ${resumeName}`, async (t) => {
    const { append, notifications, logs } = await startIsolatedWatch(t);
    const callId = index % 2 === 0 ? { call_id: 'async-call' } : {};
    append([
      { type: 'session_meta', payload: { id: 'async-session', source: 'cli' } },
      { type: 'event_msg', payload: { type: 'task_started', turn_id: 'question-turn' } },
      {
        type: 'response_item',
        payload: {
          type: index === 1 ? 'custom_tool_call' : index === 2 ? 'tool_use' : 'function_call',
          ...(index === 1 ? { function_name: 'request_user_input_async' }
            : index === 2 ? { function: { name: 'request_user_input_async' } }
              : { name: 'request_user_input_async' }),
          ...callId,
          arguments: JSON.stringify({ questions: [{ title: '请选择下一步', options: ['继续', '暂停'] }] }),
        },
      },
      {
        type: 'response_item',
        payload: {
          type: index % 2 === 0 ? 'function_call_output' : 'custom_tool_call_output',
          ...callId,
          output: JSON.stringify({ request_id: 'question', status: 'pending' }),
        },
      },
      { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'question-turn', last_agent_message: '等待你的选择' } },
    ]);
    await waitFor(() => logs.some((line) => line.includes('skipped completion (task_complete: interaction required)'))
      || notifications.some((entry) => !entry.notifyKind));
    assert.deepEqual(notifications.map((entry) => entry.notifyKind || 'complete'), ['confirm']);
    assert.match(notifications[0].summaryContext.assistantMessage, /请选择下一步/);

    append([
      resumeEvent,
      {
        type: 'response_item',
        payload: {
          type: 'function_call', name: 'request_user_input', call_id: 'sync-call',
          arguments: JSON.stringify({ question: '请选择后续处理方式' }),
        },
      },
      {
        type: 'response_item',
        payload: { type: 'function_call_output', call_id: 'sync-call', output: JSON.stringify({ answer: '继续' }) },
      },
      { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'answered-turn', last_agent_message: '已按回答完成' } },
    ]);
    await waitFor(() => notifications.some((entry) => entry.outputContent === '已按回答完成'));
    assert.deepEqual(notifications.map((entry) => entry.notifyKind || 'complete'), ['confirm', 'confirm', 'complete']);
  });
}

test('codex synchronous answers do not resolve another pending asynchronous question', async (t) => {
  const { append, notifications, logs } = await startIsolatedWatch(t);
  append([
    { type: 'event_msg', payload: { type: 'task_started', turn_id: 'mixed-turn' } },
    {
      type: 'response_item',
      payload: { type: 'function_call', name: 'request_user_input_async', call_id: 'async', arguments: JSON.stringify({ question: '请选择异步操作' }) },
    },
    { type: 'response_item', payload: { type: 'function_call_output', call_id: 'async', output: '{"status":"pending"}' } },
    {
      type: 'response_item',
      payload: { type: 'function_call', name: 'request_user_input', call_id: 'sync', arguments: JSON.stringify({ question: '请选择同步操作' }) },
    },
    { type: 'response_item', payload: { type: 'function_call_output', call_id: 'sync', output: '{"answer":"继续"}' } },
    { type: 'response_item', payload: { type: 'message', role: 'assistant', phase: 'final_answer', content: '仍在等待异步回答' } },
    { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'mixed-turn', last_agent_message: '仍在等待异步回答' } },
  ]);
  await waitFor(() => logs.some((line) => line.includes('skipped completion (task_complete: interaction required)'))
    || notifications.some((entry) => !entry.notifyKind));
  assert.deepEqual(notifications.map((entry) => entry.notifyKind || 'complete'), ['confirm', 'confirm']);
});
