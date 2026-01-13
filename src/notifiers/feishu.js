const https = require('https');
const http = require('http');

const REQUEST_TIMEOUT_MS = 10000;

function getWebhookUrlFromEnv(envName) {
  const value = process.env[envName];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

function sendFeishuPost({ webhookUrl, title, contentText }) {
  return new Promise((resolve) => {
    try {
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

      const data = JSON.stringify(payload);
      const url = new URL(webhookUrl);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve({ ok: result && result.code === 0, error: result && result.msg ? String(result.msg) : null });
          } catch (error) {
            resolve({ ok: false, error: '无法解析飞书响应' });
          }
        });
      });

      req.on('error', (error) => resolve({ ok: false, error: error.message }));
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error(`请求超时(${REQUEST_TIMEOUT_MS}ms)`));
      });
      req.write(data);
      req.end();
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

async function notifyFeishu({ config = {}, title, contentText }) {
  const channelCfg = config.channels && config.channels.feishu ? config.channels.feishu : {};
  const envName = channelCfg.webhookUrlEnv || 'FEISHU_WEBHOOK_URL';
  const webhookUrl = getWebhookUrlFromEnv(envName) || (channelCfg.webhookUrl && String(channelCfg.webhookUrl).trim()) || null;

  if (!webhookUrl) {
    return { ok: false, error: `未配置飞书 webhook（请设置环境变量 ${envName}）` };
  }

  return await sendFeishuPost({ webhookUrl, title, contentText });
}

module.exports = {
  notifyFeishu
};
