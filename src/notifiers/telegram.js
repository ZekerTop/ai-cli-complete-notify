const https = require('https');
const http = require('http');
const { URL } = require('url');
const { describeEnvValue } = require('../bootstrap');

const REQUEST_TIMEOUT_MS = 10000;
const UNAUTHORIZED_ERROR = 'Telegram rejected the Bot Token currently used by this app (401 Unauthorized). /start and Chat ID do not fix authentication. Check the credential source; verify the token with getMe or regenerate it with @BotFather.';

function firstEnvValue(candidates) {
  for (const name of candidates) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readEnvString(name) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

function sendDirect({ apiUrl, data }) {
  return new Promise((resolve) => {
    const options = {
      hostname: apiUrl.hostname,
      path: apiUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => handleResponse(res, resolve));
    req.on('error', (error) => resolve({ ok: false, error: error.message }));
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`请求超时(${REQUEST_TIMEOUT_MS}ms)`));
    });
    req.write(data);
    req.end();
  });
}

function sendViaProxy({ apiUrl, data, proxyUrl }) {
  return new Promise((resolve) => {
    try {
      const proxy = new URL(proxyUrl);
      if (!['http:', 'https:'].includes(proxy.protocol)) {
        resolve({ ok: false, error: 'Telegram proxy must use http:// or https:// (HTTP CONNECT).' });
        return;
      }

      const connectOptions = {
        hostname: proxy.hostname,
        port: proxy.port || (proxy.protocol === 'https:' ? 443 : 80),
        method: 'CONNECT',
        path: `${apiUrl.hostname}:443`,
        headers: {}
      };

      if (proxy.username && proxy.password) {
        const auth = Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64');
        connectOptions.headers['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const proxyProtocol = proxy.protocol === 'https:' ? https : http;
      const connectReq = proxyProtocol.request(connectOptions);

      connectReq.setTimeout(REQUEST_TIMEOUT_MS, () => {
        connectReq.destroy(new Error(`请求超时(${REQUEST_TIMEOUT_MS}ms)`));
      });

      connectReq.on('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          socket.destroy();
          resolve({ ok: false, error: `代理连接失败: HTTP ${res.statusCode}` });
          return;
        }

        const httpsReq = https.request(
          {
            socket,
            hostname: apiUrl.hostname,
            agent: false,
            servername: apiUrl.hostname,
            method: 'POST',
            path: apiUrl.pathname,
            headers: {
              Host: apiUrl.hostname,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data)
            }
          },
          (response) => handleResponse(response, resolve)
        );

        httpsReq.on('error', (error) => resolve({ ok: false, error: error.message }));
        httpsReq.setTimeout(REQUEST_TIMEOUT_MS, () => {
          httpsReq.destroy(new Error(`请求超时(${REQUEST_TIMEOUT_MS}ms)`));
        });
        httpsReq.write(data);
        httpsReq.end();
      });

      connectReq.on('error', (error) => resolve({ ok: false, error: error.message }));
      connectReq.end();
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

function handleResponse(res, resolve) {
  let responseData = '';
  res.on('data', (chunk) => (responseData += chunk));
  res.on('end', () => {
    if (res.statusCode === 401) {
      resolve({ ok: false, error: UNAUTHORIZED_ERROR });
      return;
    }
    try {
      const result = JSON.parse(responseData);
      if (Number(result && result.error_code) === 401) {
        resolve({ ok: false, error: UNAUTHORIZED_ERROR });
      } else if (result && result.ok) {
        resolve({ ok: true, error: null, result: result.result });
      } else {
        const description = result && result.description ? String(result.description) : '';
        if (description.toLowerCase() === 'unauthorized') {
          resolve({ ok: false, error: UNAUTHORIZED_ERROR });
          return;
        }
        resolve({ ok: false, error: description || 'Telegram 返回错误' });
      }
    } catch (error) {
      resolve({ ok: false, error: '无法解析 Telegram 响应' });
    }
  });
}

function resolveTelegram(config) {
  const telegram = config.channels.telegram;
  const botTokenEnv = telegram.botTokenEnv || 'TELEGRAM_BOT_TOKEN';
  const chatIdEnv = telegram.chatIdEnv || 'TELEGRAM_CHAT_ID';
  const envToken = readEnvString(botTokenEnv);
  const envChatId = readEnvString(chatIdEnv);
  const token = envToken || String(telegram.botToken || '').trim();
  const chatId = envChatId || String(telegram.chatId || '').trim();
  const proxyUrl = firstEnvValue(telegram.proxyEnvCandidates || []) || String(telegram.proxyUrl || '').trim();
  const diagnostics = {
    tokenSource: envToken ? describeEnvValue(botTokenEnv) : { source: token ? 'settings' : 'missing' },
    chatIdSource: envChatId ? describeEnvValue(chatIdEnv) : { source: chatId ? 'settings' : 'missing' },
    settingsTokenOverridden: Boolean(envToken && telegram.botToken && envToken !== String(telegram.botToken).trim()),
    proxyEnabled: Boolean(proxyUrl)
  };
  return { token, chatId, proxyUrl, diagnostics };
}

async function requestTelegram({ token, proxyUrl }, method, payload) {
  if (!token) return { ok: false, error: 'Telegram Bot Token is not configured.' };
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    return { ok: false, error: 'Telegram Bot Token format is invalid. Use only the token from @BotFather, without the "bot" prefix, API URL, spaces or invisible characters.' };
  }
  try {
    const apiUrl = new URL(`https://api.telegram.org/bot${token}/${method}`);
    const data = JSON.stringify(payload);
    const response = proxyUrl
      ? await sendViaProxy({ apiUrl, data, proxyUrl })
      : await sendDirect({ apiUrl, data });
    if (response.error) response.error = String(response.error).split(token).join('[redacted]');
    return response;
  } catch (_error) {
    return { ok: false, error: 'Unable to create the Telegram request. Check the token and HTTP(S) proxy configuration.' };
  }
}

async function notifyTelegram({ config, title, contentText, summaryText, outputContent, taskInfo }) {
  const resolved = resolveTelegram(config);
  if (!resolved.chatId) return { ok: false, error: 'Telegram Chat ID is not configured.' };
  const summary = String(summaryText || '').trim();
  const output = String(outputContent || '').trim();
  const detail = summary || output || String(taskInfo || '').trim();
  const heading = summary ? 'AI 摘要' : output ? 'AI 原文' : '任务';
  const messageTitle = truncateText(String(title || ''), 256);
  const body = [contentText, detail ? `${heading}\n${detail}` : ''].filter(Boolean).join('\n\n');
  // ponytail: one message capped at 4096 UTF-16 units; use multipart delivery if full long output is needed.
  const messageBody = truncateText(body, 4096 - messageTitle.length - 2);
  let result = await requestTelegram(resolved, 'sendMessage', {
    chat_id: resolved.chatId,
    text: `<b>${escapeHtml(messageTitle)}</b>\n\n${renderMarkdown(messageBody)}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
  if (!result.ok && /can't parse entities|unsupported start tag/i.test(result.error || '')) {
    result = await requestTelegram(resolved, 'sendMessage', {
      chat_id: resolved.chatId,
      text: `${messageTitle}\n\n${messageBody}`,
      disable_web_page_preview: true
    });
  }
  const error = result.error === UNAUTHORIZED_ERROR
    ? `${result.error} Credential source: ${JSON.stringify(resolved.diagnostics)}. Run "telegram-check" or use "Check Telegram" in Test notification.`
    : result.error;
  return { ok: result.ok, error };
}

async function checkTelegram(config) {
  const resolved = resolveTelegram(config);
  const identity = await requestTelegram(resolved, 'getMe', {});
  if (!identity.ok) return { ok: false, stage: 'getMe', ...resolved.diagnostics, error: identity.error };
  const botUsername = String(identity.result?.username || '');
  if (!resolved.chatId) {
    return { ok: false, stage: 'getChat', ...resolved.diagnostics, botUsername, error: 'Telegram Chat ID is not configured.' };
  }
  const chat = await requestTelegram(resolved, 'getChat', { chat_id: resolved.chatId });
  return { ok: chat.ok, stage: 'getChat', ...resolved.diagnostics, botUsername, error: chat.error };
}

function renderMarkdown(text) {
  // ponytail: common Markdown only; unsupported/nested syntax stays text, use a parser if full CommonMark is needed.
  const tokens = /```[^\n]*\n([\s\S]*?)(?:```|(?![\s\S]))|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^\n]+?)\*\*|__([^\n]+?)__|~~([^\n]+?)~~|(?<![\w*])\*([^*\n]+)\*(?!\*)|(?<!\w)_([^_\n]+)_(?!\w)|^#{1,6} +(.+)$/gm;
  let html = '';
  let offset = 0;
  for (const match of text.matchAll(tokens)) {
    html += escapeHtml(text.slice(offset, match.index));
    const [, block, code, label, url, bold, underlineBold, strike, italic, underscoreItalic, heading] = match;
    if (block !== undefined) html += `<pre>${escapeHtml(block)}</pre>`;
    else if (code !== undefined) html += `<code>${escapeHtml(code)}</code>`;
    else if (url !== undefined) html += `<a href="${escapeHtml(url).replace(/"/g, '&quot;')}">${escapeHtml(label)}</a>`;
    else if (strike !== undefined) html += `<s>${escapeHtml(strike)}</s>`;
    else if (italic !== undefined || underscoreItalic !== undefined) html += `<i>${escapeHtml(italic ?? underscoreItalic)}</i>`;
    else html += `<b>${escapeHtml(bold ?? underlineBold ?? heading)}</b>`;
    offset = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(offset));
}

function truncateText(text, limit) {
  if (text.length <= limit) return text;
  const suffix = '\n… [内容已截断]';
  return text.slice(0, limit - suffix.length).replace(/[\uD800-\uDBFF]$/, '') + suffix;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  notifyTelegram,
  checkTelegram
};
