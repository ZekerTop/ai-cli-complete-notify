const { createHash } = require('crypto');

function getDeepseekHookNotificationContext(payload, defaultTaskInfo) {
  if (!payload || typeof payload !== 'object'
    || payload.hook_event_name !== 'TurnEnd' || payload.reason !== 'completed') {
    return { skip: true, reason: 'DeepSeek Harness only notifies on completed turns' };
  }

  const session = typeof payload.session_id === 'string' ? payload.session_id.trim() : '';
  const turn = typeof payload.turn_id === 'number' && Number.isInteger(payload.turn_id) && payload.turn_id >= 0
    ? String(payload.turn_id)
    : typeof payload.turn_id === 'string' ? payload.turn_id.trim() : '';
  if (!session || !turn || typeof payload.cwd !== 'string' || !payload.cwd.trim()) {
    return { skip: true, reason: 'DeepSeek Harness completion has no session, turn or working directory' };
  }

  const startedAt = payload.started_at;
  const completedAt = payload.completed_at;
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)
    || startedAt < 0 || completedAt < startedAt) {
    return { skip: true, reason: 'DeepSeek Harness completion has invalid timing' };
  }

  const output = typeof payload.last_assistant_message === 'string'
    ? payload.last_assistant_message.replace(/\r/g, '').trim() : '';
  const prompt = typeof payload.user_prompt === 'string' ? payload.user_prompt.trim() : '';
  const task = String(defaultTaskInfo || '').trim();
  const key = createHash('sha256').update(JSON.stringify([session, turn])).digest('hex');
  return {
    taskInfo: task && task !== '任务已完成' ? task : 'DeepSeek Harness 完成',
    outputContent: output,
    summaryContext: { userMessage: prompt, assistantMessage: output },
    skipSummary: !output,
    durationMs: completedAt - startedAt,
    dedupeKey: `deepseek-complete:${key}`,
    delayMs: 0,
  };
}

module.exports = { getDeepseekHookNotificationContext };
