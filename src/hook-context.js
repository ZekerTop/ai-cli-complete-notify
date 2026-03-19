const fs = require('fs');

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(text, maxLength) {
  const value = normalizeText(text);
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function stripUiPrefix(line) {
  return String(line || '')
    .replace(/^[\s>│└├─⎿•·]+/, '')
    .trim();
}

function appendText(parts, value) {
  if (!value) return;

  if (typeof value === 'string') {
    const text = normalizeText(value);
    if (text) parts.push(text);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) appendText(parts, item);
    return;
  }

  if (typeof value !== 'object') return;

  if (typeof value.text === 'string') appendText(parts, value.text);
  if (typeof value.message === 'string') appendText(parts, value.message);
  if (value.message && typeof value.message === 'object') appendText(parts, value.message);
  if (typeof value.content === 'string') appendText(parts, value.content);
  if (Array.isArray(value.content)) appendText(parts, value.content);

  if (value.error && typeof value.error === 'object' && typeof value.error.message === 'string') {
    appendText(parts, value.error.message);
  }
}

function extractClaudeAssistantText(lastAssistantMessage) {
  const parts = [];
  appendText(parts, lastAssistantMessage);
  return normalizeText(parts.join('\n\n'));
}

function getFirstMeaningfulLine(text) {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => stripUiPrefix(line))
    .filter(Boolean);
  return lines[0] || '';
}

function tryParseApiError(line) {
  const cleaned = stripUiPrefix(line);
  const match = cleaned.match(/^API Error:\s*(\d{3})(?:\s+(.*))?$/i);
  if (!match) return null;

  const statusCode = match[1];
  const suffix = String(match[2] || '').trim();
  let summary = `API Error ${statusCode}`;

  const jsonStart = suffix.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(suffix.slice(jsonStart));
      const message = parsed?.error?.message || parsed?.message;
      if (message) {
        summary = `${summary}: ${String(message)}`;
      }
    } catch (_error) {
      // ignore parse failure and fall back to the raw suffix
    }
  }

  if (summary === `API Error ${statusCode}` && suffix && jsonStart < 0) {
    summary = `${summary}: ${suffix}`;
  }

  return truncate(summary, 88);
}

function looksLikeClaudeFailure(text) {
  const line = getFirstMeaningfulLine(text);
  if (!line) return null;

  const apiError = tryParseApiError(line);
  if (apiError) return apiError;

  const directPatterns = [
    /^(Error|错误)[:：]/i,
    /^Request (failed|error)\b/i,
    /^Authentication (failed|error)\b/i,
    /^Connection (failed|error)\b/i,
    /^Network error\b/i,
    /^Rate limit\b/i,
    /^Timed out\b/i,
    /^Permission denied\b/i,
  ];

  if (directPatterns.some((pattern) => pattern.test(line))) {
    return truncate(line, 88);
  }

  if (/(负载已经达到上限|rate limit|overloaded|over capacity|internal server error|请求超时|timed out)/i.test(text)) {
    return truncate(line, 88);
  }

  return null;
}

function parsePositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

function getClaudeHookNotifyDelayMs() {
  return parsePositiveInt(process.env.CLAUDE_HOOK_NOTIFY_DELAY_MS, 1200);
}

function safeJsonParse(line) {
  try {
    return JSON.parse(String(line || '').replace(/^\uFEFF/, ''));
  } catch (_error) {
    return null;
  }
}

function readTailUtf8(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return '';

    const size = stat.size;
    const tailBytes = Math.max(1024, parsePositiveInt(maxBytes, 256 * 1024));
    const start = Math.max(0, size - tailBytes);
    const fd = fs.openSync(filePath, 'r');

    try {
      const buffer = Buffer.alloc(size - start);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, start);
      return buffer.slice(0, bytesRead).toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch (_error) {
    return '';
  }
}

function extractClaudeAssistantTextFromTranscript(transcriptPath) {
  const filePath = String(transcriptPath || '').trim();
  if (!filePath) return '';

  const tail = readTailUtf8(filePath, 256 * 1024);
  if (!tail) return '';

  let lines = tail.split(/\r?\n/);
  if (tail.length >= 256 * 1024) lines = lines.slice(1);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const rawLine = String(lines[i] || '').trim();
    if (!rawLine) continue;
    const obj = safeJsonParse(rawLine);
    if (!obj || typeof obj !== 'object') continue;
    if (obj.isSidechain === true) continue;
    if (obj.type !== 'assistant') continue;
    const text = extractClaudeAssistantText(obj.message);
    if (text) return text;
  }

  return '';
}

function resolveClaudeAssistantText(hookContext) {
  const directText = extractClaudeAssistantText(hookContext && hookContext.last_assistant_message);
  if (directText) return directText;
  return extractClaudeAssistantTextFromTranscript(hookContext && hookContext.transcript_path);
}

function getClaudeHookNotificationContext(hookContext, defaultTaskInfo) {
  if (!hookContext || hookContext.hook_event_name !== 'Stop') return null;

  const assistantText = resolveClaudeAssistantText(hookContext);
  const failureSummary = looksLikeClaudeFailure(assistantText);
  if (!assistantText) {
    return {
      skip: true,
      reason: 'Claude Stop hook has no final assistant text yet',
    };
  }

  if (!failureSummary) {
    const normalizedDefaultTask = String(defaultTaskInfo || '').trim();
    return {
      taskInfo: normalizedDefaultTask && normalizedDefaultTask !== '任务已完成' ? normalizedDefaultTask : 'Claude 完成',
      outputContent: assistantText,
      summaryContext: { assistantMessage: assistantText },
      delayMs: getClaudeHookNotifyDelayMs(),
    };
  }

  return {
    notifyKind: 'error',
    taskInfo: `Claude 失败: ${failureSummary}`,
    outputContent: assistantText,
    summaryContext: { assistantMessage: assistantText },
    skipSummary: true,
    delayMs: 0,
  };
}

module.exports = {
  extractClaudeAssistantText,
  getClaudeHookNotificationContext,
  looksLikeClaudeFailure,
};
