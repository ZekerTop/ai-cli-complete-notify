const assert = require('node:assert/strict');
const test = require('node:test');

const { shouldSkipByNotificationMode } = require('../src/engine');
const {
  buildGeminiCompletionDedupeKey,
  getGeminiHookNotificationContext,
} = require('../src/hook-context');

test('hybrid mode keeps Codex watch and OpenCode plugin notifications', () => {
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'codex', fromHook: false, notificationMode: 'hooks' }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'codex', fromHook: true, notificationMode: 'hooks' }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'opencode', fromHook: true, notificationMode: 'hooks' }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'opencode', fromHook: false, notificationMode: 'watch' }),
    null,
  );
});

test('watch-only mode suppresses Claude/Gemini hooks but keeps watch and OpenCode', () => {
  const skippedClaude = shouldSkipByNotificationMode({
    sourceName: 'claude',
    fromHook: true,
    notificationMode: 'watch',
  });
  assert.ok(skippedClaude && skippedClaude.skipped);
  assert.match(String(skippedClaude.reason), /notificationMode is watch/i);

  const skippedGemini = shouldSkipByNotificationMode({
    sourceName: 'gemini',
    fromHook: true,
    notificationMode: 'watch',
  });
  assert.ok(skippedGemini && skippedGemini.skipped);
  assert.match(String(skippedGemini.reason), /notificationMode is watch/i);

  // Watch path itself remains allowed.
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'claude', fromHook: false, notificationMode: 'watch' }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'gemini', fromHook: false, notificationMode: 'watch' }),
    null,
  );
  // OpenCode has no watch path, so plugin notifications stay available.
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'opencode', fromHook: true, notificationMode: 'watch' }),
    null,
  );
});

test('hooks mode keeps Claude/Gemini watch as a real fallback and allows CLI paths', () => {
  // Hooks installed or not must not change hybrid routing: watch remains a
  // fallback when hooks fail to fire, and direct CLI notify/stop/run
  // (fromHook=false) still work.
  assert.equal(
    shouldSkipByNotificationMode({
      sourceName: 'claude',
      fromHook: false,
      notificationMode: 'hooks',
    }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({
      sourceName: 'claude',
      fromHook: true,
      notificationMode: 'hooks',
    }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({
      sourceName: 'gemini',
      fromHook: false,
      notificationMode: 'hooks',
    }),
    null,
  );
  assert.equal(
    shouldSkipByNotificationMode({
      sourceName: 'gemini',
      fromHook: true,
      notificationMode: 'hooks',
    }),
    null,
  );
});

test('Gemini AfterAgent hook context extracts final prompt_response for dedupe', () => {
  const context = getGeminiHookNotificationContext({
    hook_event_name: 'AfterAgent',
    session_id: 'sess-1',
    cwd: '/repo',
    prompt: 'summarize the diff',
    prompt_response: 'Implemented the Gemini dedupe fix.',
  }, '任务已完成');

  assert.deepEqual(context, {
    taskInfo: 'Gemini 完成',
    outputContent: 'Implemented the Gemini dedupe fix.',
    summaryContext: {
      userMessage: 'summarize the diff',
      assistantMessage: 'Implemented the Gemini dedupe fix.',
    },
    dedupeKey: buildGeminiCompletionDedupeKey('Implemented the Gemini dedupe fix.'),
    skipSummary: false,
    delayMs: 0,
  });
});

test('Gemini hook context accepts prompt_response without event name and ignores other events', () => {
  const partial = getGeminiHookNotificationContext({
    cwd: '/repo',
    prompt_response: 'Partial payload still works.',
  }, 'custom task');
  assert.equal(partial.taskInfo, 'custom task');
  assert.equal(partial.outputContent, 'Partial payload still works.');

  assert.equal(
    getGeminiHookNotificationContext({
      hook_event_name: 'BeforeAgent',
      prompt_response: 'should not fire',
    }, '任务已完成'),
    null,
  );
});

test('sendNotifications allows Claude hooks only outside watch-only mode', async () => {
  const enginePath = require.resolve('../src/engine');
  const configPath = require.resolve('../src/config');
  const webhookPath = require.resolve('../src/notifiers/webhook');
  const statePath = require.resolve('../src/state');
  const originalEngine = require.cache[enginePath];
  const originalConfig = require.cache[configPath];
  const originalWebhook = require.cache[webhookPath];
  const originalState = require.cache[statePath];
  const calls = [];
  let mode = 'watch';

  delete require.cache[enginePath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      loadConfig: () => ({
        format: { includeSourcePrefixInTitle: true },
        summary: { enabled: false },
        ui: { language: 'zh-CN', notificationMode: mode },
        channels: {
          webhook: { enabled: true, urls: ['https://example.test/webhook'] },
          telegram: { enabled: false },
          desktop: { enabled: false },
          sound: { enabled: false },
          email: { enabled: false },
          gotify: { enabled: false },
        },
        sources: {
          claude: {
            enabled: true,
            minDurationMinutes: 0,
            channels: { webhook: true },
          },
          codex: {
            enabled: true,
            minDurationMinutes: 0,
            channels: { webhook: true },
          },
        },
      }),
    },
  };
  require.cache[webhookPath] = {
    id: webhookPath,
    filename: webhookPath,
    loaded: true,
    exports: {
      notifyWebhook: async (args) => {
        calls.push(args);
        return { ok: true, results: [{ ok: true }] };
      },
    },
  };
  require.cache[statePath] = {
    id: statePath,
    filename: statePath,
    loaded: true,
    exports: {
      checkAndRememberNotification: () => false,
    },
  };

  try {
    const { sendNotifications } = require('../src/engine');

    const blocked = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude hook complete',
      durationMs: 1000,
      cwd: '/repo',
      force: true,
      fromHook: true,
      skipSummary: true,
      outputContent: 'done via hook',
    });
    assert.equal(blocked.skipped, true);
    assert.match(String(blocked.reason), /notificationMode is watch/i);
    assert.equal(calls.length, 0);

    mode = 'hooks';
    const hookResult = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude hook complete',
      durationMs: 1000,
      cwd: '/repo',
      force: true,
      fromHook: true,
      skipSummary: true,
      outputContent: 'done via hook',
    });
    assert.equal(hookResult.skipped, false);
    assert.equal(calls.length, 1);

    const codexResult = await sendNotifications({
      source: 'codex',
      taskInfo: 'Codex watch complete',
      durationMs: 1000,
      cwd: '/repo',
      force: true,
      fromHook: false,
      skipSummary: true,
      outputContent: 'done via watch',
    });
    assert.equal(codexResult.skipped, false);
    assert.equal(calls.length, 2);
  } finally {
    if (originalEngine) require.cache[enginePath] = originalEngine;
    else delete require.cache[enginePath];
    if (originalConfig) require.cache[configPath] = originalConfig;
    else delete require.cache[configPath];
    if (originalWebhook) require.cache[webhookPath] = originalWebhook;
    else delete require.cache[webhookPath];
    if (originalState) require.cache[statePath] = originalState;
    else delete require.cache[statePath];
  }
});

test('sendNotifications allows Claude watch fallback when hooks are installed', async () => {
  const enginePath = require.resolve('../src/engine');
  const configPath = require.resolve('../src/config');
  const webhookPath = require.resolve('../src/notifiers/webhook');
  const statePath = require.resolve('../src/state');
  const originalEngine = require.cache[enginePath];
  const originalConfig = require.cache[configPath];
  const originalWebhook = require.cache[webhookPath];
  const originalState = require.cache[statePath];
  const calls = [];

  delete require.cache[enginePath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      loadConfig: () => ({
        format: { includeSourcePrefixInTitle: true },
        summary: { enabled: false },
        ui: { language: 'zh-CN', notificationMode: 'hooks' },
        channels: {
          webhook: { enabled: true, urls: ['https://example.test/webhook'] },
          telegram: { enabled: false },
          desktop: { enabled: false },
          sound: { enabled: false },
          email: { enabled: false },
          gotify: { enabled: false },
        },
        sources: {
          claude: {
            enabled: true,
            minDurationMinutes: 0,
            channels: { webhook: true },
          },
        },
      }),
    },
  };
  require.cache[webhookPath] = {
    id: webhookPath,
    filename: webhookPath,
    loaded: true,
    exports: {
      notifyWebhook: async (args) => {
        calls.push(args);
        return { ok: true, results: [{ ok: true }] };
      },
    },
  };
  require.cache[statePath] = {
    id: statePath,
    filename: statePath,
    loaded: true,
    exports: {
      checkAndRememberNotification: () => false,
    },
  };

  try {
    const { sendNotifications } = require('../src/engine');

    // Direct CLI notify (no fromHook) must still work even with hooks installed
    const cliResult = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude CLI notify',
      durationMs: 1000,
      cwd: '/repo',
      force: true,
      fromHook: false,
      skipSummary: true,
      outputContent: 'done via cli',
    });
    assert.equal(cliResult.skipped, false);
    assert.equal(calls.length, 1);

    // Watch-originated path (also fromHook=false) remains a real fallback
    const watchResult = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude watch complete',
      durationMs: 1000,
      cwd: '/repo',
      force: true,
      fromHook: false,
      skipSummary: true,
      outputContent: 'done via watch fallback',
    });
    assert.equal(watchResult.skipped, false);
    assert.equal(calls.length, 2);
  } finally {
    if (originalEngine) require.cache[enginePath] = originalEngine;
    else delete require.cache[enginePath];
    if (originalConfig) require.cache[configPath] = originalConfig;
    else delete require.cache[configPath];
    if (originalWebhook) require.cache[webhookPath] = originalWebhook;
    else delete require.cache[webhookPath];
    if (originalState) require.cache[statePath] = originalState;
    else delete require.cache[statePath];
  }
});

test('Gemini hook and watch share content-based dedupe key across cwd mismatch', async () => {
  const enginePath = require.resolve('../src/engine');
  const configPath = require.resolve('../src/config');
  const webhookPath = require.resolve('../src/notifiers/webhook');
  const statePath = require.resolve('../src/state');
  const originalEngine = require.cache[enginePath];
  const originalConfig = require.cache[configPath];
  const originalWebhook = require.cache[webhookPath];
  const originalState = require.cache[statePath];
  const calls = [];
  const remembered = [];

  delete require.cache[enginePath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      loadConfig: () => ({
        format: { includeSourcePrefixInTitle: true },
        summary: { enabled: false },
        ui: { language: 'zh-CN', notificationMode: 'hooks' },
        channels: {
          webhook: { enabled: true, urls: ['https://example.test/webhook'] },
          telegram: { enabled: false },
          desktop: { enabled: false },
          sound: { enabled: false },
          email: { enabled: false },
          gotify: { enabled: false },
        },
        sources: {
          gemini: {
            enabled: true,
            minDurationMinutes: 0,
            channels: { webhook: true },
          },
        },
      }),
    },
  };
  require.cache[webhookPath] = {
    id: webhookPath,
    filename: webhookPath,
    loaded: true,
    exports: {
      notifyWebhook: async (args) => {
        calls.push(args);
        return { ok: true, results: [{ ok: true }] };
      },
    },
  };
  require.cache[statePath] = {
    id: statePath,
    filename: statePath,
    loaded: true,
    exports: {
      // Mirror production fingerprint shape so cwd independence is actually tested.
      checkAndRememberNotification: ({ source, cwd, text }) => {
        const key = `${source}::${cwd}::${String(text || '').trim().toLowerCase()}`;
        if (remembered.includes(key)) return true;
        remembered.push(key);
        return false;
      },
    },
  };

  try {
    const { sendNotifications } = require('../src/engine');
    const finalOutput = 'Implemented the Gemini dedupe fix.';
    const sharedKey = buildGeminiCompletionDedupeKey(finalOutput);
    const hookContext = getGeminiHookNotificationContext({
      hook_event_name: 'AfterAgent',
      session_id: 'sess-1',
      cwd: '/project/repo',
      prompt: 'fix gemini dedupe',
      prompt_response: finalOutput,
    }, '任务已完成');
    assert.equal(hookContext.dedupeKey, sharedKey);

    // Simulate Gemini AfterAgent hook path first (project cwd from payload).
    const hookResult = await sendNotifications({
      source: 'gemini',
      taskInfo: hookContext.taskInfo,
      durationMs: 1000,
      cwd: '/project/repo',
      force: true,
      fromHook: true,
      skipSummary: true,
      outputContent: hookContext.outputContent,
      summaryContext: hookContext.summaryContext,
      dedupeKey: hookContext.dedupeKey,
    });
    assert.equal(hookResult.skipped, false);
    assert.equal(calls.length, 1);

    // Later Gemini watch path for the same completion, launched from a different
    // process cwd (typical GUI/app watch). Must still dedupe via shared key.
    const watchResult = await sendNotifications({
      source: 'gemini',
      taskInfo: 'Gemini 完成',
      durationMs: 1000,
      cwd: 'C:/Users/AppData/ai-cli-complete-notify',
      projectNameOverride: 'Gemini',
      force: true,
      fromHook: false,
      skipSummary: true,
      outputContent: finalOutput,
      dedupeKey: buildGeminiCompletionDedupeKey(finalOutput),
      summaryContext: {
        userMessage: 'fix gemini dedupe',
        assistantMessage: finalOutput,
      },
    });
    assert.equal(watchResult.skipped, true);
    assert.match(String(watchResult.reason), /duplicate notification suppressed/i);
    assert.equal(calls.length, 1);
    assert.equal(remembered.length, 1);
    assert.equal(remembered[0], `gemini::::${sharedKey.toLowerCase()}`);
  } finally {
    if (originalEngine) require.cache[enginePath] = originalEngine;
    else delete require.cache[enginePath];
    if (originalConfig) require.cache[configPath] = originalConfig;
    else delete require.cache[configPath];
    if (originalWebhook) require.cache[webhookPath] = originalWebhook;
    else delete require.cache[webhookPath];
    if (originalState) require.cache[statePath] = originalState;
    else delete require.cache[statePath];
  }
});
