const https = require('https');
const http = require('http');

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_PROVIDER = 'openai';

const PROVIDER_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307'
  },
  google: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    model: 'gemini-1.5-flash'
  },
  qwen: {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo'
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  }
};

function parseEnvBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseEnvNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function readString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function coalesce(...values) {
  for (const value of values) {
    if (value == null) continue;
    const str = String(value).trim();
    if (str) return str;
  }
  return '';
}

function normalizeProvider(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'gemini') return 'google';
  if (raw === 'google' || raw === 'openai' || raw === 'anthropic' || raw === 'qwen' || raw === 'deepseek') {
    return raw;
  }
  return '';
}

function inferProviderFromUrl(url) {
  if (!url) return '';
  const lower = String(url).toLowerCase();
  if (lower.includes('anthropic.com')) return 'anthropic';
  if (lower.includes('generativelanguage.googleapis.com')) return 'google';
  if (lower.includes('dashscope.aliyuncs.com')) return 'qwen';
  if (lower.includes('deepseek.com')) return 'deepseek';
  if (lower.includes('openai.com')) return 'openai';
  return '';
}

function getProviderDefaults(provider) {
  const normalized = normalizeProvider(provider) || DEFAULT_PROVIDER;
  return PROVIDER_DEFAULTS[normalized] || PROVIDER_DEFAULTS[DEFAULT_PROVIDER];
}

function resolveGoogleApiUrl(apiUrl, model) {
  const raw = String(apiUrl || '').trim();
  const safeModel = String(model || '').trim();
  if (!raw) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent`;
  }
  if (raw.includes('{model}')) return raw.replace(/\{model\}/g, safeModel);
  if (raw.includes('/models/') && raw.includes(':generateContent')) return raw;
  if (raw.endsWith(':generateContent')) return raw;
  return raw.endsWith('/') ? `${raw}models/${safeModel}:generateContent` : `${raw}/models/${safeModel}:generateContent`;
}

function hasApiKeyInUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.searchParams.get('key') || parsed.searchParams.get('api_key'));
  } catch (_error) {
    return false;
  }
}

function normalizeSummaryConfig(config) {
  const summary = (config && config.summary) || {};
  const enabledEnv = parseEnvBoolean(process.env.SUMMARY_ENABLED);
  const enabled = enabledEnv !== undefined ? enabledEnv : Boolean(summary.enabled);

  const providerEnv = readString(process.env.SUMMARY_PROVIDER);
  let provider = normalizeProvider(providerEnv || summary.provider);
  const apiUrlCandidate = coalesce(process.env.SUMMARY_API_URL, summary.apiUrl);
  if (!provider && apiUrlCandidate) provider = inferProviderFromUrl(apiUrlCandidate);
  provider = provider || DEFAULT_PROVIDER;
  const defaults = getProviderDefaults(provider);

  const apiUrl = coalesce(process.env.SUMMARY_API_URL, summary.apiUrl, defaults.apiUrl);
  const apiKey = coalesce(process.env.SUMMARY_API_KEY, summary.apiKey);
  const model = coalesce(process.env.SUMMARY_MODEL, summary.model, defaults.model);
  const timeoutCandidate = parseEnvNumber(process.env.SUMMARY_TIMEOUT_MS) ?? summary.timeoutMs;
  const timeoutNumber = Number(timeoutCandidate);
  let timeoutMs = Number.isFinite(timeoutNumber) ? timeoutNumber : DEFAULT_TIMEOUT_MS;
  if (timeoutMs === 1200) timeoutMs = DEFAULT_TIMEOUT_MS;
  const prompt = readString(process.env.SUMMARY_PROMPT || summary.prompt || '');
  const maxTokens = parseEnvNumber(process.env.SUMMARY_MAX_TOKENS) ?? summary.maxTokens ?? DEFAULT_MAX_TOKENS;

  return {
    enabled,
    provider,
    apiUrl,
    apiKey,
    model,
    timeoutMs,
    prompt,
    maxTokens
  };
}

function defaultPrompt(language) {
  if (String(language || '').toLowerCase().startsWith('en')) {
    return 'You are a technical assistant. Summarize the task and outcome in one short sentence (<=120 chars). Output only the summary.';
  }
  return '你是一个技术助手。请根据任务与执行结果生成一句简短中文摘要（100字以内），只输出摘要本身。';
}

function truncateText(text, maxLength) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)) + '…';
}

function truncateDetail(text, maxLength) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 3)) + '...';
}

function redactSecret(text, secret) {
  const value = String(text || '');
  const token = String(secret || '');
  if (!value || !token) return value;
  return value.split(token).join('[redacted]');
}

function buildUserContent({ taskInfo, contentText, summaryContext }) {
  const context = summaryContext || {};
  const userMessage = coalesce(context.userMessage, context.input, context.lastUser, context.prompt);
  const assistantMessage = coalesce(context.assistantMessage, context.output, context.lastAssistant, context.result);

  const lines = [];
  if (taskInfo) lines.push(`Task: ${truncateText(taskInfo, 200)}`);
  if (userMessage) lines.push(`User: ${truncateText(userMessage, 800)}`);
  if (assistantMessage) lines.push(`Output: ${truncateText(assistantMessage, 1200)}`);
  if (!assistantMessage && contentText) lines.push(`Context: ${truncateText(contentText, 240)}`);

  return lines.filter(Boolean).join('\n');
}

function sanitizeSummary(text) {
  if (!text) return '';
  const cleaned = String(text).replace(/\s+/g, ' ').replace(/^["'`]+|["'`]+$/g, '').trim();
  return truncateText(cleaned, 160);
}

function extractSummary(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') return '';
  const choices = responseJson.choices;
  if (Array.isArray(choices) && choices.length) {
    const first = choices[0] || {};
    if (first.message && typeof first.message.content === 'string') return first.message.content;
    if (typeof first.text === 'string') return first.text;
  }
  if (typeof responseJson.output === 'string') return responseJson.output;
  if (responseJson.data && typeof responseJson.data.output_text === 'string') return responseJson.data.output_text;
  return '';
}

function extractAnthropicSummary(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') return '';
  const content = responseJson.content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block) return '';
        if (typeof block === 'string') return block;
        if (block.type === 'text' && typeof block.text === 'string') return block.text;
        if (typeof block.text === 'string') return block.text;
        return '';
      })
      .filter(Boolean)
      .join('');
  }
  if (typeof responseJson.completion === 'string') return responseJson.completion;
  return '';
}

function extractGoogleSummary(responseJson) {
  if (!responseJson || typeof responseJson !== 'object') return '';
  const candidates = responseJson.candidates;
  if (Array.isArray(candidates) && candidates.length) {
    const first = candidates[0] || {};
    const parts = first.content && Array.isArray(first.content.parts) ? first.content.parts : [];
    const text = parts
      .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('');
    if (text) return text;
  }
  if (typeof responseJson.text === 'string') return responseJson.text;
  return '';
}

function extractSummaryByProvider(provider, responseJson) {
  const normalized = normalizeProvider(provider) || DEFAULT_PROVIDER;
  if (normalized === 'anthropic') return extractAnthropicSummary(responseJson);
  if (normalized === 'google') return extractGoogleSummary(responseJson);
  return extractSummary(responseJson);
}

function extractStreamDeltaText(provider, payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (Array.isArray(payload.choices) && payload.choices.length) {
    const choice = payload.choices[0] || {};
    if (choice.delta && typeof choice.delta.content === 'string') return choice.delta.content;
    if (choice.delta && typeof choice.delta.text === 'string') return choice.delta.text;
    if (typeof choice.text === 'string') return choice.text;
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content;
  }

  if (provider === 'anthropic') {
    if (payload.type === 'content_block_delta' && payload.delta && typeof payload.delta.text === 'string') {
      return payload.delta.text;
    }
    if (payload.type === 'message_delta' && payload.delta && typeof payload.delta.text === 'string') {
      return payload.delta.text;
    }
  }

  return '';
}

function parseStreamingSummary(rawBody, provider) {
  const text = String(rawBody || '');
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  let output = '';
  let sawData = false;

  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('data:')) continue;
    sawData = true;
    const payloadText = trimmed.slice(5).trim();
    if (!payloadText || payloadText === '[DONE]') continue;
    try {
      const payload = JSON.parse(payloadText);
      const chunk = extractStreamDeltaText(provider, payload);
      if (chunk) output += chunk;
    } catch (_error) {
      // ignore malformed chunk
    }
  }

  if (!sawData) return '';
  return output.trim();
}

function isOpenAIProvider(provider) {
  return provider === 'openai' || provider === 'deepseek' || provider === 'qwen';
}

function buildOpenAIPayload({ model, systemPrompt, userContent, maxTokens }) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userContent });
  return {
    model,
    messages,
    temperature: 0.4,
    max_tokens: maxTokens,
    stream: false
  };
}

function buildAnthropicPayload({ model, systemPrompt, userContent, maxTokens }) {
  const payload = {
    model,
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: [{ role: 'user', content: userContent }]
  };
  if (systemPrompt) payload.system = systemPrompt;
  return payload;
}

function buildGooglePayload({ systemPrompt, userContent, maxTokens }) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: maxTokens
    }
  };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  return payload;
}

function buildRequest(summaryConfig, userContent, systemPrompt) {
  const provider = normalizeProvider(summaryConfig.provider) || DEFAULT_PROVIDER;
  const maxTokens = summaryConfig.maxTokens;

  if (provider === 'anthropic') {
    return {
      url: summaryConfig.apiUrl,
      payload: buildAnthropicPayload({
        model: summaryConfig.model,
        systemPrompt,
        userContent,
        maxTokens
      }),
      headers: {
        'x-api-key': summaryConfig.apiKey,
        'anthropic-version': '2023-06-01'
      }
    };
  }

  if (provider === 'google') {
    return {
      url: resolveGoogleApiUrl(summaryConfig.apiUrl, summaryConfig.model),
      payload: buildGooglePayload({ systemPrompt, userContent, maxTokens }),
      headers: summaryConfig.apiKey ? { 'x-goog-api-key': summaryConfig.apiKey } : {}
    };
  }

  if (isOpenAIProvider(provider)) {
    return {
      url: summaryConfig.apiUrl,
      payload: buildOpenAIPayload({
        model: summaryConfig.model,
        systemPrompt,
        userContent,
        maxTokens
      }),
      headers: {
        Authorization: `Bearer ${summaryConfig.apiKey}`
      }
    };
  }

  return {
    url: summaryConfig.apiUrl,
    payload: buildOpenAIPayload({
      model: summaryConfig.model,
      systemPrompt,
      userContent,
      maxTokens
    }),
    headers: {
      Authorization: `Bearer ${summaryConfig.apiKey}`
    }
  };
}

function postJsonWithTimeout(url, payload, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.stringify(payload);
      const target = new URL(url);
      const options = {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...(headers || {})
        }
      };

      const transport = target.protocol === 'https:' ? https : http;
      const req = transport.request(options, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body: raw });
        });
      });

      const timer = setTimeout(() => {
        req.destroy(new Error('timeout'));
      }, Math.max(200, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));

      req.on('error', (err) => reject(err));
      req.on('close', () => clearTimeout(timer));
      req.write(data);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function summarizeTask({ config, taskInfo, contentText, summaryContext }) {
  const result = await summarizeTaskDetailed({ config, taskInfo, contentText, summaryContext });
  if (result && result.ok && result.summary) return result.summary;
  return '';
}

async function summarizeTaskDetailed({ config, taskInfo, contentText, summaryContext }) {
  const summaryConfig = normalizeSummaryConfig(config);
  if (!summaryConfig.enabled) return { ok: false, error: 'disabled' };
  if (!summaryConfig.apiUrl) return { ok: false, error: 'missing_api_url' };
  if (!summaryConfig.model) return { ok: false, error: 'missing_model' };

  const provider = normalizeProvider(summaryConfig.provider) || DEFAULT_PROVIDER;
  if (provider === 'google') {
    if (!summaryConfig.apiKey && !hasApiKeyInUrl(summaryConfig.apiUrl)) {
      return { ok: false, error: 'missing_api_key' };
    }
  } else if (!summaryConfig.apiKey) {
    return { ok: false, error: 'missing_api_key' };
  }

  const userContent = buildUserContent({ taskInfo, contentText, summaryContext });
  if (!userContent) return { ok: false, error: 'empty_content' };

  const systemPrompt = summaryConfig.prompt || defaultPrompt(config && config.ui && config.ui.language);
  const request = buildRequest(summaryConfig, userContent, systemPrompt);
  if (!request || !request.url) return { ok: false, error: 'invalid_request' };

  let response = null;
  try {
    response = await postJsonWithTimeout(
      request.url,
      request.payload,
      request.headers,
      summaryConfig.timeoutMs
    );
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const code = message.includes('timeout') ? 'timeout' : 'network_error';
    return { ok: false, error: code, detail: truncateDetail(message, 200) };
  }

  const status = response && typeof response.status === 'number' ? response.status : 0;
  const rawBody = response && typeof response.body === 'string' ? response.body : '';
  const safeBody = redactSecret(truncateDetail(rawBody, 400), summaryConfig.apiKey);

  if (status < 200 || status >= 300) {
    return { ok: false, error: 'http_error', status, detail: safeBody };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawBody || '{}');
  } catch (_error) {
    const streamed = parseStreamingSummary(rawBody, provider);
    if (streamed) {
      const summary = sanitizeSummary(streamed);
      if (summary) return { ok: true, summary, status };
      return { ok: false, error: 'empty_summary', status, detail: safeBody };
    }
    return { ok: false, error: 'invalid_json', status, detail: safeBody };
  }

  const summary = sanitizeSummary(extractSummaryByProvider(provider, parsed));
  if (!summary) {
    return { ok: false, error: 'empty_summary', status, detail: safeBody };
  }

  return { ok: true, summary, status };
}

module.exports = {
  summarizeTask,
  summarizeTaskDetailed
};
