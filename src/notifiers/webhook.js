const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const REQUEST_TIMEOUT_MS = 10000;

// Logo图片key映射 - 支持深色/浅色主题
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

// 缓存主题检测结果，避免频繁查询
let cachedTheme = null;
let themeCacheTime = 0;
const THEME_CACHE_DURATION = 60000; // 缓存1分钟

/**
 * 检测Windows系统的主题模式（浅色/深色）
 * @returns {Promise<string>} 'light' 或 'dark'
 */
function detectSystemTheme() {
  return new Promise((resolve) => {
    // 检查缓存
    const now = Date.now();
    if (cachedTheme && (now - themeCacheTime) < THEME_CACHE_DURATION) {
      resolve(cachedTheme);
      return;
    }

    // 非Windows系统，默认浅色
    if (process.platform !== 'win32') {
      cachedTheme = 'light';
      themeCacheTime = now;
      resolve('light');
      return;
    }

    // Windows系统：查询注册表
    // HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize\AppsUseLightTheme
    const command = 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme';

    exec(command, { encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        // 如果查询失败，默认浅色
        console.error('[webhook] 检测系统主题失败:', error.message);
        cachedTheme = 'light';
        themeCacheTime = now;
        resolve('light');
        return;
      }

      try {
        // 将Buffer转换为字符串
        const output = stdout.toString('utf8');
        // 查找AppsUseLightTheme的值
        const match = output.match(/AppsUseLightTheme\s+REG_DWORD\s+0x(\d+)/);
        if (match) {
          const value = parseInt(match[1], 16);
          // 0 = 深色模式, 1 = 浅色模式
          const theme = value === 0 ? 'dark' : 'light';
          cachedTheme = theme;
          themeCacheTime = now;
          console.log(`[webhook] 检测到系统主题: ${theme}`);
          resolve(theme);
        } else {
          // 如果没有找到值，默认浅色
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

// 默认飞书卡片模板
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
        "content": "**完成时间**：${COMPLETE_TIME}",
        "text_align": "left",
        "text_size": "normal_v2",
        "margin": "0px 0px 0px 0px"
      },
      {
        "tag": "markdown",
        "content": "**耗时**：${SPENT_TIME}",
        "text_align": "left",
        "text_size": "normal_v2",
        "margin": "0px 0px 0px 0px"
      }
    ]
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "${CLI_NAME} 完成任务"
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

// 加载自定义卡片模板
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

// 构建飞书卡片
async function buildFeishuCard({ projectName, timestamp, durationText, sourceLabel, taskInfo, templatePath, outputContent }) {
  const template = loadCardTemplate(templatePath);

  // 检测系统主题并获取对应的logo key
  const theme = await detectSystemTheme();
  const sourceKey = sourceLabel.toLowerCase();

  // 根据主题获取logo key
  let logoKey;
  if (LOGO_MAP[sourceKey]) {
    logoKey = LOGO_MAP[sourceKey][theme] || LOGO_MAP[sourceKey]['light'];
  } else {
    logoKey = LOGO_MAP['claude'][theme];
  }

  console.log(`[webhook] 使用主题: ${theme}, logo: ${logoKey.substring(0, 30)}...`);

  // 深拷贝模板
  const card = JSON.parse(JSON.stringify(template));

  // 替换变量
  const replaceVariables = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/\${FOLDER_NAME}/g, projectName || '未知项目')
        .replace(/\${COMPLETE_TIME}/g, timestamp || '')
        .replace(/\${SPENT_TIME}/g, durationText || '未知')
        .replace(/\${CLI_NAME}/g, sourceLabel || 'AI')
        .replace(/\${logo}/g, logoKey)
        .replace(/\${TASK_INFO}/g, taskInfo || '')
        .replace(/\${OUTPUT_CONTENT}/g, outputContent || '');
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

  // 如果有输出内容，在卡片中添加markdown元素
  if (outputContent && outputContent.trim()) {
    console.log('[webhook] 检测到输出内容，长度:', outputContent.length);

    // 限制输出内容长度，避免超过飞书卡片限制
    const maxLength = 3000;
    let content = outputContent.trim();
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '\n\n...(内容过长已截断)';
    }

    console.log('[webhook] 截断后的内容长度:', content.length);

    // 转义markdown特殊字符，但保留格式
    content = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 添加分隔符和输出内容元素
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

    // 插入到卡片body的elements中
    if (cardWithVars.body && Array.isArray(cardWithVars.body.elements)) {
      cardWithVars.body.elements.push(outputElement);
      cardWithVars.body.elements.push(contentElement);
    }
  } else {
    console.log('[webhook] 未检测到输出内容');
  }

  return cardWithVars;
}

function sendWebhook(url, payload) {
  return new Promise((resolve) => {
    try {
      const data = JSON.stringify(payload);
      const u = new URL(url);
      const options = {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const protocol = u.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode }));
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

async function notifyWebhook({ config, title, contentText, projectName, timestamp, durationText, sourceLabel, taskInfo, outputContent }) {
  const channel = config.channels.webhook || {};
  const urls = readUrls(channel);
  if (!urls.length) return { ok: false, error: '未配置 WEBHOOK_URLS' };

  // 判断是否使用飞书卡片格式
  const useFeishuCard = Boolean(channel.useFeishuCard);

  let payload;

  if (useFeishuCard) {
    // 使用飞书卡片格式
    const card = await buildFeishuCard({
      projectName,
      timestamp,
      durationText,
      sourceLabel,
      taskInfo,
      templatePath: channel.cardTemplatePath,
      outputContent // 传递输出内容
    });

    payload = {
      msg_type: 'interactive',
      card: card
    };
  } else {
    // 默认飞书bot "post"格式
    payload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title,
            content: [[{ tag: 'text', text: contentText }]]
          }
        }
      }
    };
  }

  const results = [];
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const r = await sendWebhook(url, payload);
    results.push({ url, ...r });
  }

  const ok = results.every((r) => r.ok);
  return { ok, results };
}

module.exports = {
  notifyWebhook
};
