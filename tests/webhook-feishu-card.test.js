const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const test = require('node:test');

test('Feishu card keeps Codex output content in interactive payload', async (t) => {
  const originalRequest = https.request;
  const previousEnv = {
    WEBHOOK_USE_FEISHU_CARD: process.env.WEBHOOK_USE_FEISHU_CARD,
    WEBHOOK_FORMAT: process.env.WEBHOOK_FORMAT,
    WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY: process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY,
  };
  let postedPayload = null;

  t.after(() => {
    https.request = originalRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  delete process.env.WEBHOOK_USE_FEISHU_CARD;
  delete process.env.WEBHOOK_FORMAT;
  delete process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY;

  https.request = (_options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      postedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ code: 0, msg: 'success' })));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');

  const result = await notifyWebhook({
    config: {
      channels: {
        webhook: {
          urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'],
          useFeishuCard: true,
        },
      },
    },
    title: '[Codex] app: Codex 完成',
    contentText: 'Completed at: 2026/6/2 10:00:00\nSource: Codex',
    projectName: 'app',
    timestamp: '2026/6/2 10:00:00',
    durationText: '1s',
    sourceLabel: 'Codex',
    taskInfo: 'Codex 完成',
    outputContent: 'Codex final answer for Feishu card',
    summaryUsed: false,
});

  assert.equal(result.ok, true);
  assert.equal(postedPayload.msg_type, 'interactive');
  const cardText = JSON.stringify(postedPayload.card);
  assert.match(cardText, /AI提醒 原文/);
  assert.match(cardText, /Codex final answer for Feishu card/);
  assert.equal(postedPayload.card.header.icon.img_key, 'img_v3_02u8_e7160911-b3b6-49fe-98b6-4fcf92f857fg');
  const zcodeResult = await notifyWebhook({
    config: { channels: { webhook: { urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'], useFeishuCard: true } } },
    sourceName: 'zcode', sourceLabel: 'ZCode', title: 'ZCode 完成', taskInfo: 'ZCode 完成',
    projectName: 'app', summaryUsed: false,
  });
  assert.equal(zcodeResult.ok, true);
  assert.equal(postedPayload.card.header.icon.img_key, 'img_v3_0215i_61c21733-9f18-4807-a8ff-72c8f67e5b2g');

});

test('Feishu card hides original output by default when summary is present', async (t) => {
  const originalRequest = https.request;
  const previousEnv = {
    WEBHOOK_USE_FEISHU_CARD: process.env.WEBHOOK_USE_FEISHU_CARD,
    WEBHOOK_FORMAT: process.env.WEBHOOK_FORMAT,
    WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY: process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY,
  };
  let postedPayload = null;

  t.after(() => {
    https.request = originalRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  delete process.env.WEBHOOK_USE_FEISHU_CARD;
  delete process.env.WEBHOOK_FORMAT;
  delete process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY;

  https.request = (_options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      postedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ code: 0, msg: 'success' })));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');

  const result = await notifyWebhook({
    config: {
      channels: {
        webhook: {
          urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'],
          useFeishuCard: true,
        },
      },
    },
    title: '[Codex] app: brief summary',
    contentText: 'Completed at: 2026/6/2 10:00:00\nSource: Codex',
    projectName: 'app',
    timestamp: '2026/6/2 10:00:00',
    durationText: '1s',
    sourceLabel: 'Codex',
    taskInfo: 'brief summary',
    outputContent: 'Full Codex answer should not be visible by default',
    summaryUsed: true,
  });

  const cardText = JSON.stringify(postedPayload.card);
  assert.equal(result.ok, true);
  assert.match(cardText, /brief summary/);
  assert.match(cardText, /AI提醒 AI摘要/);
  assert.doesNotMatch(cardText, /Full Codex answer should not be visible by default/);
});

test('Feishu card can include original output when summary output is enabled', async (t) => {
  const originalRequest = https.request;
  const previousEnv = {
    WEBHOOK_USE_FEISHU_CARD: process.env.WEBHOOK_USE_FEISHU_CARD,
    WEBHOOK_FORMAT: process.env.WEBHOOK_FORMAT,
    WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY: process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY,
  };
  let postedPayload = null;

  t.after(() => {
    https.request = originalRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  delete process.env.WEBHOOK_USE_FEISHU_CARD;
  delete process.env.WEBHOOK_FORMAT;
  delete process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY;

  https.request = (_options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      postedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ code: 0, msg: 'success' })));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');

  const result = await notifyWebhook({
    config: {
      channels: {
        webhook: {
          urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'],
          useFeishuCard: true,
          includeOutputWhenSummary: true,
        },
      },
    },
    title: '[Codex] app: brief summary',
    contentText: 'Completed at: 2026/6/2 10:00:00\nSource: Codex',
    projectName: 'app',
    timestamp: '2026/6/2 10:00:00',
    durationText: '1s',
    sourceLabel: 'Codex',
    taskInfo: 'brief summary',
    outputContent: 'Full Codex answer should be visible when enabled',
    summaryUsed: true,
  });

  const cardText = JSON.stringify(postedPayload.card);
  assert.equal(result.ok, true);
  assert.match(cardText, /brief summary/);
  assert.match(cardText, /Full Codex answer should be visible when enabled/);
  assert.match(cardText, /\*\*AI提醒 AI摘要\*\*/);
  assert.match(cardText, /"tag":"hr"/);
  assert.match(cardText, /\*\*原文\*\*/);
  assert.doesNotMatch(cardText, /\*\*输出内容\*\*：\\n\\nAI 摘要：brief summary/);
});

test('Feishu card shows summary failure reason before fallback output', async (t) => {
  const originalRequest = https.request;
  const previousEnv = {
    WEBHOOK_USE_FEISHU_CARD: process.env.WEBHOOK_USE_FEISHU_CARD,
    WEBHOOK_FORMAT: process.env.WEBHOOK_FORMAT,
    WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY: process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY,
  };
  let postedPayload = null;

  t.after(() => {
    https.request = originalRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  delete process.env.WEBHOOK_USE_FEISHU_CARD;
  delete process.env.WEBHOOK_FORMAT;
  delete process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY;

  https.request = (_options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      postedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ code: 0, msg: 'success' })));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');

  const result = await notifyWebhook({
    config: {
      channels: {
        webhook: {
          urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'],
          useFeishuCard: true,
        },
      },
    },
    title: '[Codex] app: original task',
    contentText: 'Completed at: 2026/6/2 10:00:00\nSource: Codex',
    projectName: 'app',
    timestamp: '2026/6/2 10:00:00',
    durationText: '1s',
    sourceLabel: 'Codex',
    taskInfo: 'original task',
    outputContent: 'Fallback output should be visible',
    summaryUsed: false,
    summaryDiagnostics: {
      attempted: true,
      used: false,
      error: 'timeout',
    },
  });

  const cardText = JSON.stringify(postedPayload.card);
  assert.equal(result.ok, true);
  assert.match(cardText, /\*\*AI提醒 AI摘要\*\*：请求超时，已显示原文/);
  assert.match(cardText, /"tag":"hr"/);
  assert.match(cardText, /\*\*原文\*\*/);
  assert.match(cardText, /Fallback output should be visible/);
});

test('Feishu card shows AI reminder original text when summary and output are absent', async (t) => {
  const originalRequest = https.request;
  const previousEnv = {
    WEBHOOK_USE_FEISHU_CARD: process.env.WEBHOOK_USE_FEISHU_CARD,
    WEBHOOK_FORMAT: process.env.WEBHOOK_FORMAT,
    WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY: process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY,
  };
  let postedPayload = null;

  t.after(() => {
    https.request = originalRequest;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  delete process.env.WEBHOOK_USE_FEISHU_CARD;
  delete process.env.WEBHOOK_FORMAT;
  delete process.env.WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY;

  https.request = (_options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      postedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from(JSON.stringify({ code: 0, msg: 'success' })));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');

  const result = await notifyWebhook({
    config: {
      channels: {
        webhook: {
          urls: ['https://open.feishu.cn/open-apis/bot/v2/hook/test'],
          useFeishuCard: true,
        },
      },
    },
    title: '[Codex] app: AI提醒 测试提醒',
    contentText: 'Completed at: 2026/8/4 20:00:00\nSource: Codex',
    projectName: 'app',
    timestamp: '2026/8/4 20:00:00',
    durationText: '1m 0s',
    sourceLabel: 'Codex',
    taskInfo: 'AI提醒 测试提醒',
    outputContent: '',
    summaryUsed: false,
  });

  const cardText = JSON.stringify(postedPayload.card);
  assert.equal(result.ok, true);
  assert.match(cardText, /AI提醒 原文/);
  assert.match(cardText, /测试提醒/);
  assert.equal((cardText.match(/AI提醒/g) || []).length, 1);
});
