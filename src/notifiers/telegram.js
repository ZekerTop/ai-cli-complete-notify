const https = require('https');
const http = require('http');
const { URL } = require('url');

const REQUEST_TIMEOUT_MS = 10000;

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
          resolve({ ok: false, error: `代理连接失败: HTTP ${res.statusCode}` });
          return;
        }

        const httpsReq = https.request(
          {
            socket,
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
    try {
      const result = JSON.parse(responseData);
      if (result && result.ok) resolve({ ok: true, error: null });
      else resolve({ ok: false, error: result && result.description ? String(result.description) : 'Telegram 返回错误' });
    } catch (error) {
      resolve({ ok: false, error: '无法解析 Telegram 响应' });
    }
  });
}

async function notifyTelegram({ config, title, contentText }) {
  const botTokenEnv = config.channels.telegram.botTokenEnv || 'TELEGRAM_BOT_TOKEN';
  const chatIdEnv = config.channels.telegram.chatIdEnv || 'TELEGRAM_CHAT_ID';
  const token = readEnvString(botTokenEnv) || String(config.channels.telegram.botToken || '').trim();
  const chatId = readEnvString(chatIdEnv) || String(config.channels.telegram.chatId || '').trim();

  if (!token || !chatId) {
    return { ok: false, error: `未配置 Telegram（请设置 ${botTokenEnv} 和 ${chatIdEnv}）` };
  }

  const baseUrl = `https://api.telegram.org/bot${token}`;
  const payload = {
    chat_id: chatId,
    text: `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(contentText)}`,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  const data = JSON.stringify(payload);
  const apiUrl = new URL(baseUrl + '/sendMessage');

  const proxyUrl =
    firstEnvValue(config.channels.telegram.proxyEnvCandidates || []) ||
    String(config.channels.telegram.proxyUrl || '').trim();
  if (proxyUrl) {
    return await sendViaProxy({ apiUrl, data, proxyUrl });
  }
  return await sendDirect({ apiUrl, data });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  notifyTelegram
};
