const https = require('https');
const http = require('http');
const { URL } = require('url');

const REQUEST_TIMEOUT_MS = 10000;

function notifyGotify({ config, title, contentText, kind = 'complete' }) {
  const gotifyCfg = (config.channels && config.channels.gotify) || {};

  const url =
    process.env[gotifyCfg.urlEnv || 'GOTIFY_URL'] ||
    String(gotifyCfg.url || '').trim();
  const appToken =
    process.env[gotifyCfg.appTokenEnv || 'GOTIFY_APP_TOKEN'] ||
    String(gotifyCfg.appToken || '').trim();

  if (!url || !appToken) {
    return Promise.resolve({
      ok: false,
      error: '未配置 Gotify（请设置 GOTIFY_URL 和 GOTIFY_APP_TOKEN）',
    });
  }

  const priorityMap = gotifyCfg.priority || {};
  const priority =
    priorityMap[kind] ?? (kind === 'error' ? 10 : kind === 'confirm' ? 8 : 5);

  let apiUrl;
  try {
    apiUrl = new URL('/message', url);
  } catch (err) {
    return Promise.resolve({ ok: false, error: `Gotify URL 无效: ${err.message}` });
  }
  apiUrl.searchParams.set('token', appToken);

  const payload = JSON.stringify({ title, message: contentText, priority });

  return new Promise((resolve) => {
    const lib = apiUrl.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        path: apiUrl.pathname + apiUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, error: null });
          } else {
            resolve({
              ok: false,
              error: `Gotify 返回错误: HTTP ${res.statusCode}`,
            });
          }
        });
      },
    );

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('请求超时'));
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { notifyGotify };
