const https = require('https');
const http = require('http');

const REQUEST_TIMEOUT_MS = 10000;

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

async function notifyWebhook({ config, title, contentText }) {
  const channel = config.channels.webhook || {};
  const urls = readUrls(channel);
  if (!urls.length) return { ok: false, error: '未配置 WEBHOOK_URLS' };

  // Default Feishu bot "post" format; adjust if your webhook expects another schema.
  const payload = {
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
