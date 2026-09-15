const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_WEBHOOK_OUTPUT_MAX_LENGTH = 3000;
const WEBHOOK_MESSAGE_MARKER = 'AI提醒';

// Logo key map for light and dark themes.
const LOGO_MAP = {
  'zcode': {
    light: 'img_v3_0215i_61c21733-9f18-4807-a8ff-72c8f67e5b2g',
    dark: 'img_v3_0215i_61c21733-9f18-4807-a8ff-72c8f67e5b2g'
  },
  'codex': {
    light: 'img_v3_02u8_e7160911-b3b6-49fe-98b6-4fcf92f857fg',
    dark: 'img_v3_02u8_789a1ca1-bfe3-4091-a2a3-55a264d2383g'
  },
  'opencode': {
    light: 'img_v3_02104_f9d256c4-a7c9-4631-854d-d66d72b6159g',
    dark: 'img_v3_02104_f9d256c4-a7c9-4631-854d-d66d72b6159g'
  },
  'claude': {
    light: 'img_v3_02u8_5ee72144-4bc3-4242-add0-e60ac3ad800g',
    dark: 'img_v3_02u8_5ee72144-4bc3-4242-add0-e60ac3ad800g'
  },
  'claudecode': {
    light: 'img_v3_02u8_5ee72144-4bc3-4242-add0-e60ac3ad800g',
    dark: 'img_v3_02u8_5ee72144-4bc3-4242-add0-e60ac3ad800g'
  },
  'gemini': {
    light: 'img_v3_02u8_273239e1-26d9-4a32-b27a-b54fc1807c5g',
    dark: 'img_v3_02u8_273239e1-26d9-4a32-b27a-b54fc1807c5g'
  },
  'geminicli': {
    light: 'img_v3_02u8_273239e1-26d9-4a32-b27a-b54fc1807c5g',
    dark: 'img_v3_02u8_273239e1-26d9-4a32-b27a-b54fc1807c5g'
  }
};

// Cache the detected system theme to avoid frequent registry queries.
let cachedTheme = null;
let themeCacheTime = 0;
const THEME_CACHE_DURATION = 60000; // Cache for 1 minute.

/**
 * Detect the Windows system theme.
 * @returns {Promise<string>} 'light' or 'dark'
 */
function detectSystemTheme() {
  return new Promise((resolve) => {
    // Return cached result when available.
    const now = Date.now();
    if (cachedTheme && (now - themeCacheTime) < THEME_CACHE_DURATION) {
      resolve(cachedTheme);
      return;
    }

    // Non-Windows platforms fall back to light theme.
    if (process.platform !== 'win32') {
      cachedTheme = 'light';
      themeCacheTime = now;
      resolve('light');
      return;
    }

    // Read the Windows registry theme flag.
    // HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme
    const command = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme';

    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        // Fall back to light theme if registry query fails.
        console.error('[webhook] 检测系统主题失败:', error.message);
        cachedTheme = 'light';
        themeCacheTime = now;
        resolve('light');
        return;
      }

      try {
        // Decode the registry output as UTF-8 text.
        const output = stdout.toString('utf8');
        // Extract AppsUseLightTheme value.
        const match = output.match(/AppsUseLightTheme\s+REG_DWORD\s+0x(\d+)/);
        if (match) {
          const value = parseInt(match[1], 16);
          // 0 = dark mode, 1 = light mode.
          const theme = value === 0 ? 'dark' : 'light';
          cachedTheme = theme;
          themeCacheTime = now;
          console.log(`[webhook] 检测到系统主题: ${theme}`);
          resolve(theme);
        } else {
          // Fall back to light theme if the registry value is missing.
          cachedTheme = 'light';
          themeCacheTime = now;
          resolve('light');
        }
      } catch (err) {
        console.error('[webhook] 解析主题检测结果失败:', err.message);
        cachedTheme = 'light';
        themeCacheTime = now;
        resolve('light');
      }
    });
  });
}

// Default Feishu card template.
const DEFAULT_CARD_TEMPLATE = {
  "schema": "2.0",
  "config": {
    "update_multi": true,
    "style": {
      "text_size": {
        "normal_v2": {
          "default": "normal",
          "pc": "normal",
          "mobile": "heading"
        }
      }
    }
  },
  "body": {
    "direction": "vertical",
    "horizontal_spacing": "8px",
    "vertical_spacing": "8px",
    "horizontal_align": "left",
    "vertical_align": "top",
    "padding": "12px 12px 12px 12px",
    "elements": [
      {
        "tag": "markdown",
        "content": "**\u5b8c\u6210\u65f6\u95f4**\uff1a${COMPLETE_TIME}",
        "text_align": "left",
        "text_size": "normal_v2",
        "margin": "0px 0px 0px 0px"
      },
      {
        "tag": "markdown",
        "content": "**\u8017\u65f6**\uff1a${SPENT_TIME}",
        "text_align": "left",
        "text_size": "normal_v2",
        "margin": "0px 0px 0px 0px"
      }
    ]
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "${CLI_NAME} \u5b8c\u6210\u4efb\u52a1"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": "${FOLDER_NAME}"
    },
    "template": "wathet",
    "icon": {
      "tag": "custom_icon",
      "img_key": "${logo}"
    },
    "padding": "12px 12px 12px 12px"
  }
};

const WEBHOOK_PROVIDERS = {
  FEISHU: 'feishu',
  WECOM: 'wecom',
  DINGTALK: 'dingtalk',
  GENERIC: 'generic'
};

function detectWebhookProvider(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('qyapi.weixin.qq.com')) return WEBHOOK_PROVIDERS.WECOM;
    if (hostname.includes('oapi.dingtalk.com')) return WEBHOOK_PROVIDERS.DINGTALK;
    if (hostname.includes('feishu.cn') || hostname.includes('larksuite.com')) return WEBHOOK_PROVIDERS.FEISHU;
  } catch (error) {
    return WEBHOOK_PROVIDERS.GENERIC;
  }
  return WEBHOOK_PROVIDERS.GENERIC;
}

function splitUrls(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const SOURCE_WEBHOOK_ENV_NAMES = Object.freeze({
  claude: 'CLAUDE_WEBHOOK_URLS',
  codex: 'CODEX_WEBHOOK_URLS',
  gemini: 'GEMINI_WEBHOOK_URLS',
  opencode: 'OPENCODE_WEBHOOK_URLS',
  zcode: 'ZCODE_WEBHOOK_URLS'
});

function readConfigUrls(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((url) => String(url || '').trim())
    .filter(Boolean);
}

function readUrls(channel, sourceName, sourceConfig) {
  const normalizedSource = String(sourceName || '').trim().toLowerCase();
  const sourceEnvName = SOURCE_WEBHOOK_ENV_NAMES[normalizedSource];
  const sourceUrlsFromEnv = sourceEnvName ? splitUrls(process.env[sourceEnvName]) : [];
  if (sourceUrlsFromEnv.length) return sourceUrlsFromEnv;

  const sourceUrlsFromConfig = readConfigUrls(sourceConfig && sourceConfig.webhookUrls);
  if (sourceUrlsFromConfig.length) return sourceUrlsFromConfig;

  const envName = channel.urlsEnv || 'WEBHOOK_URLS';
  const envVal = process.env[envName];
  const urlsFromEnv = splitUrls(envVal);
  const urlsFromConfig = readConfigUrls(channel.urls);
  return urlsFromEnv.length ? urlsFromEnv : urlsFromConfig;
}

function parseBooleanToggle(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return undefined;
}

function parseEnvCardToggle(value) {
  const parsed = parseBooleanToggle(value);
  if (parsed !== undefined) return parsed;
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'card') return true;
  if (normalized === 'post') return false;
  return undefined;
}

function readUseFeishuCard(channel) {
  const envName = channel.useFeishuCardEnv || 'WEBHOOK_USE_FEISHU_CARD';
  const raw = process.env[envName];
  const fallbackFormat = process.env.WEBHOOK_FORMAT;
  const parsed = parseEnvCardToggle(raw != null && raw !== '' ? raw : fallbackFormat);
  if (parsed !== undefined) return parsed;
  return Boolean(channel.useFeishuCard);
}

function readIncludeOutputWhenSummary(channel) {
  const envName = channel.includeOutputWhenSummaryEnv || 'WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY';
  const parsed = parseBooleanToggle(process.env[envName]);
  if (parsed !== undefined) return parsed;
  return Boolean(channel.includeOutputWhenSummary);
}

function readOutputMaxLength(channel) {
  const envName = channel.outputMaxLengthEnv || 'WEBHOOK_OUTPUT_MAX_LENGTH';
  const raw = process.env[envName] != null && process.env[envName] !== ''
    ? process.env[envName]
    : channel.outputMaxLength;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_WEBHOOK_OUTPUT_MAX_LENGTH;
  return Math.floor(parsed);
}

function truncateOutputText(text, maxLength) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (raw.length <= maxLength) return raw;
  return raw.slice(0, maxLength) + '\n\n...(内容过长已截断)';
}

function formatSummaryFailureText(summaryDiagnostics) {
  if (!summaryDiagnostics || !summaryDiagnostics.attempted || summaryDiagnostics.used || summaryDiagnostics.skipped) return '';
  const error = String(summaryDiagnostics.error || 'fallback');
  const labels = {
    timeout: '请求超时',
    missing_api_url: '缺少 API URL',
    missing_model: '缺少模型',
    missing_api_key: '缺少 API Key',
    empty_content: '摘要上下文为空',
    invalid_request: '请求参数无效',
    network_error: '网络错误',
    http_error: 'HTTP 请求失败',
    invalid_json: '响应不是合法 JSON',
    empty_summary: '未返回摘要',
    fallback: '摘要生成失败'
  };
  const label = labels[error] || error;
  const status = summaryDiagnostics.status ? ` HTTP ${summaryDiagnostics.status}` : '';
  return `${label}${status}，已显示原文`;
}

function ensureWebhookMarker(text, existingContent = '') {
  const content = String(text || '').trim();
  if (`${existingContent}\n${content}`.includes(WEBHOOK_MESSAGE_MARKER)) return content;
  return content ? `${WEBHOOK_MESSAGE_MARKER}\n\n${content}` : WEBHOOK_MESSAGE_MARKER;
}

function stripLeadingWebhookMarker(text) {
  return String(text || '')
    .trim()
    .replace(new RegExp(`^${WEBHOOK_MESSAGE_MARKER}(?:\\s+|$)`), '')
    .trim();
}

// Build plain text fallback content.
function buildPlainText({ title, contentText, summaryText, outputText, summaryFailureText }) {
  const blocks = [title, contentText].filter(Boolean);
  if (summaryText) blocks.push(`**AI 摘要**\n${summaryText}`);
  if (summaryFailureText) blocks.push(`**AI 摘要**：${summaryFailureText}`);
  if (outputText) {
    if (summaryText || summaryFailureText) {
      blocks.push('---', `原文\n${outputText}`);
    } else {
      blocks.push(`输出内容：\n${outputText}`);
    }
  }
  return ensureWebhookMarker(blocks.join('\n\n'));
}

function loadCardTemplate(templatePath) {
  try {
    if (templatePath && fs.existsSync(templatePath)) {
      const content = fs.readFileSync(templatePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load card template:', error.message);
  }
  return DEFAULT_CARD_TEMPLATE;
}

// Build Feishu card payload.
async function buildFeishuCard({ projectName, timestamp, durationText, sourceLabel, taskInfo, summaryUsed, templatePath, outputContent, summaryFailureText }) {
  const template = loadCardTemplate(templatePath);
  const hasTaskInfoPlaceholder = JSON.stringify(template).includes('${TASK_INFO}');
  const trimmedOutput = String(outputContent || '').trim();
  const taskText = stripLeadingWebhookMarker(taskInfo);
  const shouldInjectTaskInfo = Boolean(taskText) && !hasTaskInfoPlaceholder;

  // Detect the current system theme and choose the matching logo.
  const theme = await detectSystemTheme();
  const sourceKey = sourceLabel.toLowerCase();

  // Resolve logo by source and theme.
  let logoKey;
  if (LOGO_MAP[sourceKey]) {
    logoKey = LOGO_MAP[sourceKey][theme] || LOGO_MAP[sourceKey]['light'];
  } else {
    logoKey = LOGO_MAP['claude'][theme];
  }

  console.log(`[webhook] 使用主题: ${theme}, logo: ${logoKey.substring(0, 30)}...`);

  // Deep-clone the template before replacing variables.
  const card = JSON.parse(JSON.stringify(template));

  // Replace template variables recursively.
  const replaceVariables = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/\$\{FOLDER_NAME\}|\{FOLDER_NAME\}/g, projectName || '\u672a\u77e5\u9879\u76ee')
        .replace(/\$\{COMPLETE_TIME\}|\{COMPLETE_TIME\}/g, timestamp || '')
        .replace(/\$\{SPENT_TIME\}|\{SPENT_TIME\}/g, durationText || '\u672a\u77e5')
        .replace(/\$\{CLI_NAME\}|\{CLI_NAME\}/g, sourceLabel || 'AI')
        .replace(/\$\{logo\}|\{logo\}/g, logoKey)
        .replace(/\$\{TASK_INFO\}|\{TASK_INFO\}/g, taskText)
        .replace(/\$\{OUTPUT_CONTENT\}|\{OUTPUT_CONTENT\}/g, outputContent || '');
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceVariables);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceVariables(value);
      }
      return result;
    }
    return obj;
  };

  const cardWithVars = replaceVariables(card);

  if (taskText && cardWithVars.body && Array.isArray(cardWithVars.body.elements) && shouldInjectTaskInfo && !trimmedOutput) {
    cardWithVars.body.elements.push({
      tag: 'markdown',
      content: `**${summaryUsed ? 'AI提醒 AI摘要' : 'AI提醒 原文'}**\n\n${taskText}`,
      text_align: 'left',
      text_size: 'normal_v2',
      margin: '8px 0 0 0'
    });
  }

  // Append output content when it exists.
  if (trimmedOutput) {
    let content = trimmedOutput;
    console.log('[webhook] 检测到输出内容，长度:', content.length);

    // Limit output length to keep card size under control.
    const maxLength = 3000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + "\n\n...(\u5185\u5bb9\u8fc7\u957f\u5df2\u622a\u65ad)";
    }

    console.log('[webhook] 截断后的内容长度:', content.length);

    // Escape HTML-sensitive characters while keeping markdown layout.
    content = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const taskContent = taskText
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const summaryFailureContent = String(summaryFailureText || '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (cardWithVars.body && Array.isArray(cardWithVars.body.elements)) {
      if (summaryUsed && taskContent && shouldInjectTaskInfo) {
        cardWithVars.body.elements.push({
          tag: 'markdown',
          content: `**AI提醒 AI摘要**\n\n${taskContent}`,
          text_align: 'left',
          text_size: 'normal_v2',
          margin: '8px 0 0 0'
        });
      }
      if (!summaryUsed && summaryFailureContent) {
        cardWithVars.body.elements.push({
          tag: 'markdown',
          content: `**AI提醒 AI摘要**：${summaryFailureContent}`,
          text_align: 'left',
          text_size: 'normal_v2',
          margin: '8px 0 0 0'
        });
      }
      cardWithVars.body.elements.push({
        tag: 'hr',
        margin: '12px 0 12px 0'
      });
      cardWithVars.body.elements.push({
        tag: 'markdown',
        content: `${summaryUsed || summaryFailureContent ? '**原文**' : '**AI提醒 原文**'}\n\n${content}`,
        text_align: 'left',
        text_size: 'normal_v2',
        margin: '8px 0 0 0'
      });
    }
  } else {
    console.log('[webhook] 未检测到输出内容');
  }

  if (!JSON.stringify(cardWithVars).includes(WEBHOOK_MESSAGE_MARKER)
    && cardWithVars.body
    && Array.isArray(cardWithVars.body.elements)) {
    cardWithVars.body.elements.push({
      tag: 'markdown',
      content: `**${WEBHOOK_MESSAGE_MARKER}**`,
      text_align: 'left',
      text_size: 'normal_v2',
      margin: '8px 0 0 0'
    });
  }

  return cardWithVars;
}

function buildFeishuPostPayload({ title, contentText, summaryText, outputText, summaryFailureText }) {
  const blocks = [contentText];
  if (summaryText) blocks.push(`**AI 摘要**\n${summaryText}`);
  if (summaryFailureText) blocks.push(`**AI 摘要**：${summaryFailureText}`);
  if (outputText) {
    if (summaryText || summaryFailureText) {
      blocks.push('---', `原文\n${outputText}`);
    } else {
      blocks.push(`输出内容：\n${outputText}`);
    }
  }
  const textBlock = ensureWebhookMarker(blocks.filter(Boolean).join('\n\n'), title);
  return {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title,
          content: [[{ tag: 'text', text: textBlock }]]
        }
      }
    }
  };
}

function buildWecomPayload({ title, contentText, summaryText, outputText, summaryFailureText }) {
  return {
    msgtype: 'text',
    text: {
      content: buildPlainText({ title, contentText, summaryText, outputText, summaryFailureText })
    }
  };
}

function buildDingtalkPayload({ title, contentText, summaryText, outputText, summaryFailureText }) {
  return {
    msgtype: 'text',
    text: {
      content: buildPlainText({ title, contentText, summaryText, outputText, summaryFailureText })
    }
  };
}

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function sanitizeWebhookError(error) {
  return String(error || 'unknown error')
    .replace(/https?:\/\/\S+/gi, '<redacted URL>')
    .replace(/\b(access_token|token|secret)=\S+/gi, '$1=<redacted>');
}

function evaluateWebhookResponse(provider, status, bodyText) {
  const statusOk = status >= 200 && status < 300;
  if (!statusOk) return { ok: false, error: `HTTP ${status}` };

  const body = safeParseJson(bodyText);
  if (!body) return { ok: true };

  if (provider === WEBHOOK_PROVIDERS.WECOM || provider === WEBHOOK_PROVIDERS.DINGTALK) {
    if (typeof body.errcode === 'number') {
      if (body.errcode === 0) return { ok: true, response: body };
      return { ok: false, error: body.errmsg || `errcode ${body.errcode}`, response: body };
    }
  }

  if (provider === WEBHOOK_PROVIDERS.FEISHU) {
    if (typeof body.code === 'number') {
      if (body.code === 0) return { ok: true, response: body };
      return { ok: false, error: body.msg || `code ${body.code}`, response: body };
    }
  }

  return { ok: true, response: body };
}

async function buildPayloadByProvider({
  provider,
  useFeishuCard,
  projectName,
  timestamp,
  durationText,
  sourceLabel,
  title,
  contentText,
  summaryText,
  taskInfo,
  summaryUsed,
  summaryFailureText,
  outputText,
  channel
}) {
  if (provider === WEBHOOK_PROVIDERS.FEISHU) {
    if (useFeishuCard) {
      const card = await buildFeishuCard({
        projectName,
        timestamp,
        durationText,
        sourceLabel,
        taskInfo,
        summaryUsed,
        summaryFailureText,
        templatePath: channel.cardTemplatePath,
        outputContent: outputText
      });
      return { payload: { msg_type: 'interactive', card }, format: 'feishu_card' };
    }
    return { payload: buildFeishuPostPayload({ title, contentText, summaryText, outputText, summaryFailureText }), format: 'feishu_post' };
  }

  if (provider === WEBHOOK_PROVIDERS.WECOM) {
    return { payload: buildWecomPayload({ title, contentText, summaryText, outputText, summaryFailureText }), format: 'wecom_text' };
  }

  if (provider === WEBHOOK_PROVIDERS.DINGTALK) {
    return { payload: buildDingtalkPayload({ title, contentText, summaryText, outputText, summaryFailureText }), format: 'dingtalk_text' };
  }

  return { payload: buildFeishuPostPayload({ title, contentText, summaryText, outputText, summaryFailureText }), format: 'feishu_post' };
}

function sendWebhook(url, payload, provider) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify(payload);
      const u = new URL(url);
      const options = {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const protocol = u.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString('utf8');
        });
        res.on('end', () => {
          const status = res.statusCode || 0;
          const evaluated = evaluateWebhookResponse(provider, status, body);
          resolve({
            ok: evaluated.ok,
            status,
            error: evaluated.error,
            response: evaluated.response
          });
        });
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error('timeout')));
      req.write(data);
      req.end();
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

async function notifyWebhook({ config, title, contentText, projectName, timestamp, durationText, sourceName, sourceLabel, taskInfo, outputContent, summaryUsed, summaryDiagnostics }) {
  const channel = config.channels.webhook || {};
  const sourceConfig = sourceName && config.sources ? config.sources[sourceName] : null;
  const urls = readUrls(channel, sourceName, sourceConfig);
  if (!urls.length) return { ok: false, error: '\u672a\u914d\u7f6eWEBHOOK_URLS' };

  // 鍒ゆ柇鏄惁浣跨敤椋炰功鍗＄墖鏍煎紡
  const useFeishuCard = readUseFeishuCard(channel);
  const includeOutputWhenSummary = readIncludeOutputWhenSummary(channel);
  const outputMaxLength = readOutputMaxLength(channel);
  const summarySucceeded = Boolean(summaryUsed);
  const rawTaskText = String(taskInfo || '').trim();
  const summaryText = summarySucceeded ? rawTaskText : '';
  const summaryFailureText = formatSummaryFailureText(summaryDiagnostics);
  const rawOutputText = String(outputContent || '').trim();

  const results = [];
  for (const url of urls) {
    const provider = detectWebhookProvider(url);
    const isFeishuCard = provider === WEBHOOK_PROVIDERS.FEISHU && useFeishuCard;
    const shouldIncludeOutput = Boolean(rawOutputText) && (!summarySucceeded || includeOutputWhenSummary);
    const outputText = shouldIncludeOutput
      ? (isFeishuCard ? rawOutputText : truncateOutputText(rawOutputText, outputMaxLength))
      : '';
    // eslint-disable-next-line no-await-in-loop
    const { payload, format } = await buildPayloadByProvider({
      provider,
      useFeishuCard,
      projectName,
      timestamp,
      durationText,
      sourceLabel,
      title,
      contentText,
      summaryText,
      taskInfo: rawTaskText,
      summaryUsed: summarySucceeded,
      summaryFailureText,
      outputText,
      channel
    });
    // eslint-disable-next-line no-await-in-loop
    const r = await sendWebhook(url, payload, provider);
    results.push({ url, provider, format, ...r });
  }

  const ok = results.every((r) => r.ok);
  const error = results
    .filter((result) => !result.ok)
    .map((result) => {
      const reason = result.error || (result.status ? `HTTP ${result.status}` : 'unknown error');
      return `${result.provider || 'webhook'}: ${sanitizeWebhookError(reason)}`;
    })
    .join('; ');
  return { ok, results, ...(error ? { error } : {}) };
}

module.exports = {
  notifyWebhook
};
