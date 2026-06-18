const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const http = require('node:http');
const test = require('node:test');

test('notifyGotify returns error when url not configured', async () => {
  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: { channels: { gotify: {} } },
    title: 'Test',
    contentText: 'Test content',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /未配置 Gotify/);
});

test('notifyGotify returns error when appToken not configured', async () => {
  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: { channels: { gotify: { url: 'http://localhost:8080' } } },
    title: 'Test',
    contentText: 'Test content',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /未配置 Gotify/);
});

test('notifyGotify sends correct payload on success', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedPayload = null;
  let capturedPath = null;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    capturedPath = options.path;
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: {
      channels: {
        gotify: {
          url: 'http://localhost:8080',
          appToken: 'my-token',
        },
      },
    },
    title: 'Hello',
    contentText: 'World',
  });

  assert.equal(result.ok, true);
  assert.equal(capturedPayload.title, 'Hello');
  assert.equal(capturedPayload.message, 'World');
  assert.match(capturedPath, /token=my-token/);
});

test('notifyGotify builds short title from projectName/sourceLabel and puts taskInfo into body', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedPayload = null;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const longTaskInfo = '这是一段比较长的任务内容，会被 buildTitle 拼到 title 里造成 title 过长';
  await notifyGotify({
    config: {
      channels: { gotify: { url: 'http://localhost:8080', appToken: 'tok' } },
      ui: { language: 'zh-CN' },
    },
    kind: 'complete',
    projectName: 'my-project',
    sourceLabel: 'Claude',
    taskInfo: longTaskInfo,
    contentText: 'Completed at: 2026/06/18 22:03:12\nDuration: 10m 0s\nSource: Claude',
  });

  assert.equal(capturedPayload.title, '[Claude] my-project');
  assert.ok(capturedPayload.message.startsWith(longTaskInfo));
  assert.match(capturedPayload.message, /Completed at: 2026\/06\/18 22:03:12/);
  assert.match(capturedPayload.message, /Duration: 10m 0s/);
  assert.match(capturedPayload.message, /Source: Claude/);
});

test('notifyGotify appends localized status suffix for non-complete kinds', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  const captured = [];

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      captured.push(JSON.parse(body));
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const baseConfig = {
    channels: { gotify: { url: 'http://localhost:8080', appToken: 'tok' } },
    ui: { language: 'zh-CN' },
  };

  await notifyGotify({
    config: baseConfig,
    kind: 'error',
    projectName: 'my-project',
    sourceLabel: 'Claude',
    taskInfo: 'boom',
    contentText: 'meta',
  });
  await notifyGotify({
    config: baseConfig,
    kind: 'confirm',
    projectName: 'my-project',
    sourceLabel: 'Claude',
    taskInfo: 'are you sure?',
    contentText: 'meta',
  });
  await notifyGotify({
    config: { ...baseConfig, ui: { language: 'en' } },
    kind: 'error',
    projectName: 'my-project',
    sourceLabel: 'Claude',
    taskInfo: 'boom',
    contentText: 'meta',
  });

  assert.equal(captured[0].title, '[Claude] my-project · 失败');
  assert.equal(captured[1].title, '[Claude] my-project · 待确认');
  assert.equal(captured[2].title, '[Claude] my-project · Failed');
});

test('notifyGotify falls back to provided title when projectName/sourceLabel missing', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedPayload = null;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  await notifyGotify({
    config: {
      channels: { gotify: { url: 'http://localhost:8080', appToken: 'tok' } },
    },
    title: 'Legacy title',
    contentText: 'Body',
  });

  assert.equal(capturedPayload.title, 'Legacy title');
  assert.equal(capturedPayload.message, 'Body');
});

test('notifyGotify uses priority 10 for error kind', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedPayload = null;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  await notifyGotify({
    config: {
      channels: {
        gotify: { url: 'http://localhost:8080', appToken: 'tok' },
      },
    },
    title: 'Error',
    contentText: 'Something broke',
    kind: 'error',
  });

  assert.equal(capturedPayload.priority, 10);
});

test('notifyGotify uses priority 8 for confirm kind', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedPayload = null;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  await notifyGotify({
    config: {
      channels: {
        gotify: { url: 'http://localhost:8080', appToken: 'tok' },
      },
    },
    title: 'Confirm',
    contentText: 'Please confirm',
    kind: 'confirm',
  });

  assert.equal(capturedPayload.priority, 8);
});

test('notifyGotify returns error on non-2xx response', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 401;
      callback(res);
      res.emit('data', Buffer.from('Unauthorized'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: {
      channels: {
        gotify: { url: 'http://localhost:8080', appToken: 'tok' },
      },
    },
    title: 'Test',
    contentText: 'Body',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /HTTP 401/);
});

test('notifyGotify returns error on malformed url', async () => {
  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: { channels: { gotify: { url: 'not-a-url', appToken: 'token' } } },
    title: 'Test',
    contentText: 'Test content',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Gotify URL 无效/);
});

test('notifyGotify prefers env vars over config values', async (t) => {
  const originalHttpsRequest = https.request;
  const originalHttpRequest = http.request;
  let capturedHostname = null;
  let capturedPort = null;
  let capturedPath = null;
  const previousEnv = {
    GOTIFY_URL: process.env.GOTIFY_URL,
    GOTIFY_APP_TOKEN: process.env.GOTIFY_APP_TOKEN,
  };

  t.after(() => {
    https.request = originalHttpsRequest;
    http.request = originalHttpRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  process.env.GOTIFY_URL = 'http://env-host:9090';
  process.env.GOTIFY_APP_TOKEN = 'env-token';

  http.request = (options, callback) => {
    let body = '';
    capturedHostname = options.hostname;
    capturedPort = options.port;
    capturedPath = options.path;
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
  https.request = http.request;

  delete require.cache[require.resolve('../src/notifiers/gotify')];
  const { notifyGotify } = require('../src/notifiers/gotify');

  const result = await notifyGotify({
    config: {
      channels: {
        gotify: {
          url: 'http://config-host:8080',
          appToken: 'config-token',
        },
      },
    },
    title: 'Test',
    contentText: 'Body',
  });

  assert.equal(result.ok, true);
  assert.equal(capturedHostname, 'env-host');
  assert.equal(capturedPort, '9090');
  assert.match(capturedPath, /token=env-token/);
});
