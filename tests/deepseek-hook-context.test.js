const test = require('node:test');
const assert = require('node:assert/strict');
const { getDeepseekHookNotificationContext: context } = require('../src/deepseek-hook');

function payload(overrides = {}) {
  return {
    hook_event_name: 'TurnEnd', reason: 'completed', session_id: 'session-1', turn_id: 1,
    cwd: '/repo/demo', started_at: 1000, completed_at: 61000,
    user_prompt: '修复登录', last_assistant_message: '已修复\r\n验证通过', ...overrides,
  };
}

test('DeepSeek completion carries reply, user prompt and native turn duration into notifications', () => {
  const result = context(payload(), '任务已完成');
  assert.equal(result.taskInfo, 'DeepSeek Harness 完成');
  assert.equal(result.durationMs, 60000);
  assert.equal(result.outputContent, '已修复\n验证通过');
  assert.deepEqual(result.summaryContext, { userMessage: '修复登录', assistantMessage: '已修复\n验证通过' });
  assert.equal(result.skipSummary, false);
  assert.equal(context(payload(), '自定义任务').taskInfo, '自定义任务');
});

test('DeepSeek completion identity follows session and turn rather than reply text or working directory', () => {
  const first = context(payload()).dedupeKey;
  assert.equal(context(payload({ last_assistant_message: 'changed', cwd: '/other' })).dedupeKey, first);
  assert.equal(context(payload({ turn_id: '1' })).dedupeKey, first);
  assert.notEqual(context(payload({ turn_id: 2 })).dedupeKey, first);
  assert.notEqual(context(payload({ session_id: 'session-2' })).dedupeKey, first);
});

test('DeepSeek ignores non-completions, missing identities and invalid native timing', () => {
  for (const value of [null, [], {}, payload({ hook_event_name: 'Stop' }), payload({ reason: 'aborted' }),
    payload({ session_id: '' }), payload({ turn_id: '' }), payload({ turn_id: -1 }), payload({ cwd: '' }),
    payload({ started_at: undefined }), payload({ completed_at: '61000' }), payload({ completed_at: 999 }),
    payload({ started_at: -1 }), payload({ completed_at: Infinity })]) {
    assert.equal(context(value).skip, true, JSON.stringify(value));
  }
});

test('DeepSeek textless completions skip the AI summary without inventing a reply', () => {
  const result = context(payload({ last_assistant_message: undefined }));
  assert.equal(result.skipSummary, true);
  assert.equal(result.outputContent, '');
  assert.equal(result.durationMs, 60000);
});
