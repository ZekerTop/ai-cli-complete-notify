const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const test = require('node:test');

// Real CLI, dotenv, CONNECT and TLS; only the Telegram endpoint is a local fixture.
test('explicit env credentials reach Telegram unchanged despite stale inherited values', async (t) => {
  const root = path.join(__dirname, '..');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-integration-'));
  t.after(() => fs.rmSync(work, { recursive: true, force: true }));
  const keyPath = path.join(work, 'key.pem');
  const certPath = path.join(work, 'cert.pem');
  const certificate = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath, '-out', certPath, '-days', '1', '-subj', '/CN=api.telegram.org',
    '-addext', 'subjectAltName=DNS:api.telegram.org'], { encoding: 'utf8' });
  assert.equal(certificate.status, 0, 'OpenSSL is required for the local TLS fixture');
  const token = '1234567890:fixture-valid';
  const calls = [];
  const sockets = new Set();
  const api = https.createServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const method = req.url.slice(req.url.lastIndexOf('/') + 1);
      const valid = req.url.startsWith(`/bot${token}/`);
      calls.push({ valid, method, payload: JSON.parse(body) });
      res.writeHead(valid ? 200 : 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(valid
        ? { ok: true, result: { id: 123, is_bot: true, username: 'fixture_bot', title: 'private chat title' } }
        : { ok: false, error_code: 401, description: 'Unauthorized' }));
    });
  });
  const proxy = http.createServer();
  proxy.on('connect', (req, socket, head) => {
    assert.equal(req.url, 'api.telegram.org:443');
    const upstream = net.connect(api.address().port, '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      socket.pipe(upstream); upstream.pipe(socket);
    });
    sockets.add(socket); sockets.add(upstream);
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
  });
  t.after(() => { for (const socket of sockets) socket.destroy(); proxy.close(); api.close(); });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const config = structuredClone(require('../src/default-config').DEFAULT_CONFIG);
  for (const channel of Object.keys(config.channels)) config.channels[channel].enabled = channel === 'telegram';
  config.sources.claude.channels.telegram = true;
  config.summary.enabled = false;
  fs.writeFileSync(path.join(work, 'settings.json'), JSON.stringify(config));
  const preload = path.join(work, 'route-local.cjs');
  fs.writeFileSync(preload, `
    const https = require('node:https');
    const tls = require('node:tls');
    https.globalAgent.createConnection = (options, callback) => tls.connect({
      ...options, host: '127.0.0.1', port: Number(process.env.TELEGRAM_TEST_TLS_PORT), servername: 'api.telegram.org'
    }, callback);
  `);
  for (const transport of ['proxy', 'direct']) {
    fs.writeFileSync(path.join(work, '.env'), `TELEGRAM_BOT_TOKEN=${token}\nTELEGRAM_CHAT_ID=123\nHTTPS_PROXY=${transport === 'proxy' ? `http://127.0.0.1:${proxy.address().port}` : ''}\nSUMMARY_ENABLED=false\n`);
    const env = { ...process.env, AI_CLI_COMPLETE_NOTIFY_ENV_PATH: path.join(work, '.env'),
      AI_CLI_COMPLETE_NOTIFY_DATA_DIR: work, NODE_EXTRA_CA_CERTS: certPath,
      TELEGRAM_BOT_TOKEN: '1234567890:fixture-stale', TELEGRAM_CHAT_ID: '456',
      HTTP_PROXY: '', http_proxy: '', https_proxy: '',
      NODE_OPTIONS: transport === 'direct' ? `--require ${JSON.stringify(preload)}` : '',
      TELEGRAM_TEST_TLS_PORT: String(api.address().port) };
    for (const command of [['notify', '--source', 'claude', '--task', 'local fixture', '--force', '--skip-dedupe'], ['telegram-check']]) {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [process.env.AI_NOTIFY_TEST_ENTRY || path.join(root, 'ai-reminder.js'), ...command], { cwd: work, env });
        let stdout = '', stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('exit', code => resolve({ code, stdout, stderr }));
      });
      assert.equal(result.code, 0, result.stderr || result.stdout);
      assert.doesNotMatch(result.stdout, /fixture-valid|fixture-stale|private chat title/);
      if (command[0] === 'notify') assert.match(result.stdout, /OK telegram/);
      else {
        const diagnostic = JSON.parse(result.stdout);
        assert.equal(diagnostic.ok, true);
        assert.equal(diagnostic.botUsername, 'fixture_bot');
        assert.equal(diagnostic.tokenSource.source, 'env-file');
        assert.equal(diagnostic.tokenSource.envFile, path.join(work, '.env'));
        assert.equal(diagnostic.tokenSource.shadowsEnvFile, false);
      }
    }
  }
  assert.deepEqual(calls.map(call => call.method), ['sendMessage', 'getMe', 'getChat', 'sendMessage', 'getMe', 'getChat']);
  assert.ok(calls.every(call => call.valid));
  assert.equal(calls[0].payload.chat_id, '123');
  assert.equal(calls[2].payload.chat_id, '123');
});
