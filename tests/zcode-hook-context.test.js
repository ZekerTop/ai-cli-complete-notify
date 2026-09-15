const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getHerdrHookNotificationContext,
  getZcodeHookNotificationContext,
} = require('../src/hook-context');
const { buildTitle, getSourceLabel } = require('../src/format');

function withEnv(t, overrides) {
  const names = ['ZCODE_PROJECT_DIR', 'CLAUDE_PROJECT_DIR', 'ZCODE_SESSION_ID', 'CLAUDE_SESSION_ID'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  Object.assign(process.env, overrides);
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

test('zcode Stop payload yields a completion context with content and a stable dedupe key', () => {
  const context = getZcodeHookNotificationContext({
    hook_event_name: 'Stop',
    session_id: 'sess-42',
    cwd: '/repo/demo',
    response: 'Finished the refactor.',
  }, '任务已完成');

  assert.deepEqual(context, {
    taskInfo: 'ZCode 完成',
    outputContent: 'Finished the refactor.',
    summaryContext: { assistantMessage: 'Finished the refactor.' },
    dedupeKey: 'zcode-complete:sess-42:Finished the refactor.',
    skipSummary: false,
    delayMs: 0,
  });
});

test('zcode payload task_info overrides the default task label', () => {
  const context = getZcodeHookNotificationContext({
    hook_event_name: 'Stop',
    cwd: '/repo/demo',
    task_info: '重命名完成',
    response: 'ok',
  }, '重命名完成');

  assert.equal(context.taskInfo, '重命名完成');
  assert.equal(context.outputContent, 'ok');
});

test('non-Stop events and non-object payloads are rejected', () => {
  assert.equal(getZcodeHookNotificationContext(null, 'task').skip, true);
  assert.equal(getZcodeHookNotificationContext('Stop', 'task').skip, true);
  assert.equal(getZcodeHookNotificationContext({}, 'task').skip, true);
  assert.equal(getZcodeHookNotificationContext({
    hook_event_name: 'PreToolUse',
    response: 'should not fire',
  }, 'task').skip, true);
  assert.equal(getZcodeHookNotificationContext({
    hook_event_name: 'UserPromptSubmit',
  }, 'task').skip, true);
});

test('absent optional fields fall back to the project directory name without erroring', () => {
  const context = getZcodeHookNotificationContext({
    hook_event_name: 'Stop',
    cwd: '/repo/demo',
  }, '任务已完成');

  assert.deepEqual(context, {
    taskInfo: 'ZCode 完成',
    outputContent: 'demo',
    dedupeKey: 'zcode-complete:demo:demo',
    skipSummary: true,
    delayMs: 0,
  });
});

test('zcode context is isolated from the herdr plugin context builder', () => {
  const payload = {
    hook_event_name: 'Stop',
    cwd: '/repo/demo',
    response: 'done',
  };
  assert.equal(getHerdrHookNotificationContext({ ...payload, hook_source: 'zcode' }, 'task'), null);
  assert.notEqual(getZcodeHookNotificationContext(payload, 'task'), null);
});

test('Claude-compatible environment variables backfill a sparse payload', (t) => {
  withEnv(t, {
    ZCODE_PROJECT_DIR: '/env/zcode-repo',
    ZCODE_SESSION_ID: 'env-sess-1',
    CLAUDE_PROJECT_DIR: '/env/claude-repo',
    CLAUDE_SESSION_ID: 'env-claude-sess',
  });

  const zcodePreferred = getZcodeHookNotificationContext({ hook_event_name: 'Stop' }, '任务已完成');
  assert.equal(zcodePreferred.outputContent, 'zcode-repo');
  assert.equal(zcodePreferred.dedupeKey, 'zcode-complete:env-sess-1:zcode-repo');

  delete process.env.ZCODE_PROJECT_DIR;
  delete process.env.ZCODE_SESSION_ID;

  const claudeFallback = getZcodeHookNotificationContext({ hook_event_name: 'Stop' }, '任务已完成');
  assert.equal(claudeFallback.outputContent, 'claude-repo');
  assert.equal(claudeFallback.dedupeKey, 'zcode-complete:env-claude-sess:claude-repo');
});

test('identical completions share a dedupe key; different sessions or projects do not', () => {
  const payload = {
    hook_event_name: 'Stop',
    session_id: 'sess-1',
    cwd: '/repo/demo',
    response: 'Done.',
  };

  const first = getZcodeHookNotificationContext(payload, '任务已完成');
  const second = getZcodeHookNotificationContext({ ...payload }, '任务已完成');
  assert.equal(first.dedupeKey, second.dedupeKey);

  const otherSession = getZcodeHookNotificationContext({ ...payload, session_id: 'sess-2' }, '任务已完成');
  assert.notEqual(first.dedupeKey, otherSession.dedupeKey);

  const noSessionDemo = getZcodeHookNotificationContext({ ...payload, session_id: undefined }, '任务已完成');
  const noSessionOther = getZcodeHookNotificationContext({
    ...payload, session_id: undefined, cwd: '/repo/other',
  }, '任务已完成');
  assert.notEqual(noSessionDemo.dedupeKey, noSessionOther.dedupeKey);
});

test('zcode source label renders as [ZCode] in notification titles', () => {
  assert.equal(getSourceLabel('zcode'), 'ZCode');
  const title = buildTitle({
    projectName: 'demo',
    taskInfo: 'ZCode 完成',
    sourceLabel: getSourceLabel('zcode'),
    includeSourcePrefixInTitle: true,
  });
  assert.match(title, /^\[ZCode\] demo: /);
});
