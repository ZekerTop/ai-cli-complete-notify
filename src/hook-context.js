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

function getOpenCodeHookNotificationContext(hookContext, defaultTaskInfo) {
  if (!hookContext || hookContext.hook_source !== 'opencode-plugin') return null;

  const eventName = String(hookContext.hook_event_name || '').trim();
  if (!eventName) return null;

  const assistantText = normalizeText(
    hookContext.output_content
      || hookContext.assistant_message
      || hookContext.error_message
      || ''
  );
  const defaultTask = String(defaultTaskInfo || '').trim();

  if (eventName === 'session.error') {
    const failureSummary = truncate(
      hookContext.error_message
        || assistantText
        || 'OpenCode task failed',
      88,
    );
    return {
      notifyKind: 'error',
      taskInfo: defaultTask && defaultTask !== '任务已完成' ? defaultTask : `OpenCode 失败: ${failureSummary}`,
      outputContent: assistantText,
      summaryContext: assistantText ? { assistantMessage: assistantText } : undefined,
      skipSummary: true,
      delayMs: 0,
    };
  }

  if (eventName !== 'session.idle' && eventName !== 'session.status') return null;

  return {
    taskInfo: defaultTask && defaultTask !== '任务已完成' ? defaultTask : 'OpenCode 完成',
    outputContent: assistantText,
    summaryContext: assistantText ? { assistantMessage: assistantText } : undefined,
    skipSummary: !assistantText,
    delayMs: 0,
  };
}

function normalizeGeminiSessionScope(scopeInput) {
  if (scopeInput == null) return '';
  if (typeof scopeInput === 'string' || typeof scopeInput === 'number') {
    const direct = String(scopeInput).trim();
    if (!direct) return '';
    // Bare session ids stay as-is; file paths reduce to basename so hook
    // transcript_path and watch currentFile can share the same scope.
    const normalized = direct.replace(/\\/g, '/');
    const base = normalized.includes('/')
      ? (normalized.split('/').filter(Boolean).pop() || normalized)
      : normalized;
    return base.toLowerCase();
  }

  if (typeof scopeInput !== 'object') return '';

  // Prefer transcript/currentFile basename first so AfterAgent hooks and the
  // Gemini watch path (which only has currentFile) share the same scope.
  const fileScope = String(
    scopeInput.transcriptPath
      || scopeInput.transcript_path
      || scopeInput.currentFile
      || scopeInput.file
      || ''
  ).trim();
  if (fileScope) return normalizeGeminiSessionScope(fileScope);

  const sessionId = String(scopeInput.sessionId || scopeInput.session_id || '').trim();
  if (sessionId) return sessionId.toLowerCase();
  return '';
}

function buildGeminiCompletionDedupeKey(assistantText, sessionScope) {
  // Shared by Gemini hook and watch paths. Must not include process.cwd():
  // watch often runs from the app cwd while hooks carry the project cwd.
  // Session scope (session_id / transcript basename / currentFile basename)
  // keeps different projects or chats with identical output from suppressing
  // each other, while still collapsing the same completion across paths.
  const text = normalizeText(assistantText);
  if (!text) return '';
  const scope = normalizeGeminiSessionScope(sessionScope) || 'unknown';
  return `gemini-complete:${scope}:${text}`;
}

function getGeminiHookNotificationContext(hookContext, defaultTaskInfo) {
  if (!hookContext || typeof hookContext !== 'object') return null;

  const eventName = String(hookContext.hook_event_name || '').trim();
  // AfterAgent is the Gemini completion hook. Accept an empty event name only
  // when prompt_response is present so older/partial payloads still work.
  const hasPromptResponse = Object.prototype.hasOwnProperty.call(hookContext, 'prompt_response')
    || Object.prototype.hasOwnProperty.call(hookContext, 'output_content');
  if (eventName && eventName !== 'AfterAgent') return null;
  if (!eventName && !hasPromptResponse) return null;

  const assistantText = normalizeText(
    hookContext.prompt_response
      || hookContext.output_content
      || hookContext.response
      || hookContext.assistant_message
      || ''
  );
  const userText = normalizeText(
    hookContext.prompt
      || hookContext.user_message
      || ''
  );
  const defaultTask = String(defaultTaskInfo || '').trim();
  // Prefer transcript basename so it can match watch currentFile; fall back to
  // session_id when no transcript path is present.
  const dedupeKey = buildGeminiCompletionDedupeKey(assistantText, {
    transcriptPath: hookContext.transcript_path,
    sessionId: hookContext.session_id,
  });

  // Align with the Gemini watch path: task label is "Gemini 完成", and the
  // final assistant text is used as outputContent / summaryContext / dedupeKey
  // so content-based dedupe can collapse hook + watch duplicates even when
  // their cwd values differ.
  return {
    taskInfo: defaultTask && defaultTask !== '任务已完成' ? defaultTask : 'Gemini 完成',
    outputContent: assistantText,
    summaryContext: {
      userMessage: userText,
      assistantMessage: assistantText,
    },
    dedupeKey: dedupeKey || undefined,
    skipSummary: !assistantText,
    delayMs: 0,
  };
}

module.exports = {
  buildGeminiCompletionDedupeKey,
  extractClaudeAssistantText,
  getClaudeHookNotificationContext,
  getGeminiHookNotificationContext,
  getOpenCodeHookNotificationContext,
  looksLikeClaudeFailure,
  normalizeGeminiSessionScope,
};
