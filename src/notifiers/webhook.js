const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const REQUEST_TIMEOUT_MS = 10000;

// Logo鍥剧墖key鏄犲皠 - 鏀寔娣辫壊/娴呰壊涓婚
const LOGO_MAP = {
  'codex': {
    light: 'img_v3_02u8_e7160911-b3b6-49fe-98b6-4fcf92f857fg',
    dark: 'img_v3_02u8_789a1ca1-bfe3-4091-a2a3-55a264d2383g'
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

// 缂撳瓨涓婚妫€娴嬬粨鏋滐紝閬垮厤棰戠箒鏌ヨ
let cachedTheme = null;
let themeCacheTime = 0;
const THEME_CACHE_DURATION = 60000; // 缂撳瓨1鍒嗛挓

/**
 * 妫€娴媁indows绯荤粺鐨勪富棰樻ā寮忥紙娴呰壊/娣辫壊锛?
 * @returns {Promise<string>} 'light' 鎴?'dark'
 */
function detectSystemTheme() {
  return new Promise((resolve) => {
    // 妫€鏌ョ紦瀛?
    const now = Date.now();
    if (cachedTheme && (now - themeCacheTime) < THEME_CACHE_DURATION) {
      resolve(cachedTheme);
      return;
    }

    // 闈濿indows绯荤粺锛岄粯璁ゆ祬鑹?
    if (process.platform !== 'win32') {
      cachedTheme = 'light';
      themeCacheTime = now;
      resolve('light');
      return;
    }

    // Windows绯荤粺锛氭煡璇㈡敞鍐岃〃
    // HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme
    const command = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme';

    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        // 濡傛灉鏌ヨ澶辫触锛岄粯璁ゆ祬鑹?
        console.error('[webhook] 妫€娴嬬郴缁熶富棰樺け璐?', error.message);
        cachedTheme = 'light';
        themeCacheTime = now;
        resolve('light');
        return;
      }

      try {
        // 灏咮uffer杞崲涓哄瓧绗︿覆
        const output = stdout.toString('utf8');
        // 鏌ユ壘AppsUseLightTheme鐨勫€?
        const match = output.match(/AppsUseLightTheme\s+REG_DWORD\s+0x(\d+)/);
        if (match) {
          const value = parseInt(match[1], 16);
          // 0 = 娣辫壊妯″紡, 1 = 娴呰壊妯″紡
          const theme = value === 0 ? 'dark' : 'light';
          cachedTheme = theme;
          themeCacheTime = now;
          console.log(`[webhook] 妫€娴嬪埌绯荤粺涓婚: ${theme}`);
          resolve(theme);
        } else {
          // 濡傛灉娌℃湁鎵惧埌鍊硷紝榛樿娴呰壊
          cachedTheme = 'light';
          themeCacheTime = now;
          resolve('light');
        }
      } catch (err) {
        console.error('[webhook] 瑙ｆ瀽涓婚妫€娴嬬粨鏋滃け璐?', err.message);
        cachedTheme = 'light';
        themeCacheTime = now;
        resolve('light');
      }
    });
  });
}

// 榛樿椋炰功鍗＄墖妯℃澘
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

function readUrls(channel) {
  const envName = channel.urlsEnv || 'WEBHOOK_URLS';
  const envVal = process.env[envName];
  const urlsFromEnv = splitUrls(envVal);
  const urlsFromConfig = Array.isArray(channel.urls) ? channel.urls.filter(Boolean) : [];
  return urlsFromEnv.length ? urlsFromEnv : urlsFromConfig;
}

function parseEnvCardToggle(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on', 'card'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', 'post'].includes(normalized)) return false;
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

// 鍔犺浇鑷畾涔夊崱鐗囨ā鏉?
function buildPlainText({ title, contentText, summaryText, outputText }) {
  const blocks = [title, contentText].filter(Boolean);
  if (summaryText) blocks.push(`AI \u6458\u8981\uff1a${summaryText}`);
  if (outputText) blocks.push(`输出内容：\n${outputText}`);
  return blocks.join('\n');
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

// 鏋勫缓椋炰功鍗＄墖
async function buildFeishuCard({ projectName, timestamp, durationText, sourceLabel, taskInfo, templatePath, outputContent }) {
  const template = loadCardTemplate(templatePath);
  const hasTaskInfoPlaceholder = JSON.stringify(template).includes('${TASK_INFO}');
  const trimmedOutput = String(outputContent || '').trim();
  const shouldInjectSummary = Boolean(taskInfo) && !hasTaskInfoPlaceholder;

  // 妫€娴嬬郴缁熶富棰樺苟鑾峰彇瀵瑰簲鐨刲ogo key
  const theme = await detectSystemTheme();
  const sourceKey = sourceLabel.toLowerCase();

  // 鏍规嵁涓婚鑾峰彇logo key
  let logoKey;
  if (LOGO_MAP[sourceKey]) {
    logoKey = LOGO_MAP[sourceKey][theme] || LOGO_MAP[sourceKey]['light'];
  } else {
    logoKey = LOGO_MAP['claude'][theme];
  }

  console.log(`[webhook] 浣跨敤涓婚: ${theme}, logo: ${logoKey.substring(0, 30)}...`);

  // 娣辨嫹璐濇ā鏉?
  const card = JSON.parse(JSON.stringify(template));

  // 鏇挎崲鍙橀噺
  const replaceVariables = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/\$\{FOLDER_NAME\}|\{FOLDER_NAME\}/g, projectName || '\u672a\u77e5\u9879\u76ee')
        .replace(/\$\{COMPLETE_TIME\}|\{COMPLETE_TIME\}/g, timestamp || '')
        .replace(/\$\{SPENT_TIME\}|\{SPENT_TIME\}/g, durationText || '\u672a\u77e5')
        .replace(/\$\{CLI_NAME\}|\{CLI_NAME\}/g, sourceLabel || 'AI')
        .replace(/\$\{logo\}|\{logo\}/g, logoKey)
        .replace(/\$\{TASK_INFO\}|\{TASK_INFO\}/g, taskInfo || '')
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

  if (taskInfo && cardWithVars.body && Array.isArray(cardWithVars.body.elements) && shouldInjectSummary && !trimmedOutput) {
    cardWithVars.body.elements.push({
      tag: 'markdown',
      content: `**AI \u6458\u8981**\uff1a${taskInfo}`,
      text_align: 'left',
      text_size: 'normal_v2',
      margin: '8px 0 0 0'
    });
  }

  // 濡傛灉鏈夎緭鍑哄唴瀹癸紝鍦ㄥ崱鐗囦腑娣诲姞markdown鍏冪礌
  if (trimmedOutput) {
    let content = trimmedOutput;
    if (shouldInjectSummary) {
      content = `AI 摘要：${taskInfo}\n\n${content}`;
    }
    console.log('[webhook] 妫€娴嬪埌杈撳嚭鍐呭锛岄暱搴?', content.length);

    // 闄愬埗杈撳嚭鍐呭闀垮害锛岄伩鍏嶈秴杩囬涔﹀崱鐗囬檺鍒?
    const maxLength = 3000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + "\n\n...(\u5185\u5bb9\u8fc7\u957f\u5df2\u622a\u65ad)";
    }

    console.log('[webhook] 鎴柇鍚庣殑鍐呭闀垮害:', content.length);

    // 杞箟markdown鐗规畩瀛楃锛屼絾淇濈暀鏍煎紡
    content = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 娣诲姞鍒嗛殧绗﹀拰杈撳嚭鍐呭鍏冪礌
    const outputElement = {
      tag: 'hr',
      margin: '12px 0 12px 0'
    };

    const contentElement = {
      tag: 'markdown',
      content: `**输出内容**：\n\n${content}`,
      text_align: 'left',
      text_size: 'normal_v2',
      margin: '8px 0 0 0'
    };

    // 鎻掑叆鍒板崱鐗嘼ody鐨別lements涓?
    if (cardWithVars.body && Array.isArray(cardWithVars.body.elements)) {
      cardWithVars.body.elements.push(outputElement);
      cardWithVars.body.elements.push(contentElement);
    }
  } else {
    console.log('[webhook] 鏈娴嬪埌杈撳嚭鍐呭');
  }

  return cardWithVars;
}

function buildFeishuPostPayload({ title, contentText, summaryText, outputText }) {
  const blocks = [contentText];
  if (summaryText) blocks.push(`AI \u6458\u8981\uff1a${summaryText}`);
  if (outputText) blocks.push(`输出内容：\n${outputText}`);
  const textBlock = blocks.filter(Boolean).join('\n');
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

function buildWecomPayload({ title, contentText, summaryText, outputText }) {
  return {
    msgtype: 'text',
    text: {
      content: buildPlainText({ title, contentText, summaryText, outputText })
    }
  };
}

function buildDingtalkPayload({ title, contentText, summaryText, outputText }) {
  return {
    msgtype: 'text',
    text: {
      content: buildPlainText({ title, contentText, summaryText, outputText })
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
        taskInfo: summaryText,
        templatePath: channel.cardTemplatePath,
        outputContent: outputText
      });
      return { payload: { msg_type: 'interactive', card }, format: 'feishu_card' };
    }
    return { payload: buildFeishuPostPayload({ title, contentText, summaryText, outputText }), format: 'feishu_post' };
  }

  if (provider === WEBHOOK_PROVIDERS.WECOM) {
    return { payload: buildWecomPayload({ title, contentText, summaryText, outputText }), format: 'wecom_text' };
  }

  if (provider === WEBHOOK_PROVIDERS.DINGTALK) {
    return { payload: buildDingtalkPayload({ title, contentText, summaryText, outputText }), format: 'dingtalk_text' };
  }

  return { payload: buildFeishuPostPayload({ title, contentText, summaryText, outputText }), format: 'feishu_post' };
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

async function notifyWebhook({ config, title, contentText, projectName, timestamp, durationText, sourceLabel, taskInfo, outputContent, summaryUsed }) {
  const channel = config.channels.webhook || {};
  const urls = readUrls(channel);
  if (!urls.length) return { ok: false, error: '\u672a\u914d\u7f6eWEBHOOK_URLS' };

  // 鍒ゆ柇鏄惁浣跨敤椋炰功鍗＄墖鏍煎紡
  const useFeishuCard = readUseFeishuCard(channel);
  const summarySucceeded = Boolean(summaryUsed);
  const summaryText = summarySucceeded ? String(taskInfo || '').trim() : '';
  const outputText = summarySucceeded ? '' : String(outputContent || '').trim();

  const results = [];
  for (const url of urls) {
    const provider = detectWebhookProvider(url);
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
      outputText,
      channel
    });
    // eslint-disable-next-line no-await-in-loop
    const r = await sendWebhook(url, payload, provider);
    results.push({ url, provider, format, ...r });
  }

  const ok = results.every((r) => r.ok);
  return { ok, results };
}

module.exports = {
  notifyWebhook
};
