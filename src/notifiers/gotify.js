const https = require('https');
const http = require('http');
const { URL } = require('url');

const REQUEST_TIMEOUT_MS = 10000;
const TITLE_MAX_LENGTH = 80;

function statusSuffix(kind, lang) {
  const isEn = String(lang || '').toLowerCase().startsWith('en');
  if (kind === 'error') return isEn ? 'Failed' : '失败';
  if (kind === 'confirm') return isEn ? 'Needs confirmation' : '待确认';
  return '';
}

function truncate(text, max) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildGotifyTitle({ projectName, sourceLabel, kind, lang, fallbackTitle }) {
  const project = projectName ? String(projectName).trim() : '';
  const source = sourceLabel ? String(sourceLabel).trim() : '';
  const prefix = source ? `[${source}] ` : '';

  let base;
  if (project) base = `${prefix}${project}`;
  else if (source) base = `[${source}]`;
  else base = String(fallbackTitle || '').trim() || 'Notification';

  const suffix = statusSuffix(kind, lang);
  const composed = suffix ? `${base} · ${suffix}` : base;
  return truncate(composed, TITLE_MAX_LENGTH);
}

function buildGotifyMessage({ taskInfo, contentText }) {
  const body = String(taskInfo || '').trim();
  const meta = String(contentText || '').trim();
  if (body && meta) return `${body}\n\n${meta}`;
  return body || meta;
}

function notifyGotify({
  config,
  title,
  contentText,
  kind = 'complete',
  projectName,
  sourceLabel,
  taskInfo,
  language,
}) {
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

  const lang = language || (config && config.ui && config.ui.language) || 'zh-CN';
  const finalTitle = buildGotifyTitle({
    projectName,
    sourceLabel,
    kind,
    lang,
    fallbackTitle: title,
  });
  const finalMessage = buildGotifyMessage({ taskInfo, contentText });

  const payload = JSON.stringify({
    title: finalTitle,
    message: finalMessage,
    priority,
  });

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
