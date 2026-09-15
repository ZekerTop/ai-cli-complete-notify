const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('explicit env wins while implicit env preserves and reports inherited overrides', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-env-'));
  try {
    const envPath = path.join(dir, '.env');
    fs.writeFileSync(envPath, 'TELEGRAM_BOT_TOKEN=123:from-file\n');
    const script = `
      const assert = require('node:assert/strict');
      const envPath = process.argv[1];
      for (const key of ['AI_CLI_COMPLETE_NOTIFY_ENV_PATH', 'AICLI_COMPLETE_NOTIFY_ENV_PATH', 'TASKPULSE_ENV_PATH', 'AI_REMINDER_ENV_PATH']) delete process.env[key];
      require('./src/paths').getEnvPathCandidates = () => [envPath];
      const { bootstrapEnv, describeEnvValue } = require('./src/bootstrap');
      process.env.TELEGRAM_BOT_TOKEN = '123:inherited';
      bootstrapEnv();
      assert.equal(process.env.TELEGRAM_BOT_TOKEN, '123:inherited');
      assert.deepEqual(describeEnvValue('TELEGRAM_BOT_TOKEN'), { source: 'process-environment', envFile: envPath, shadowsEnvFile: true });
      process.env.AI_CLI_COMPLETE_NOTIFY_ENV_PATH = envPath;
      bootstrapEnv();
      assert.equal(process.env.TELEGRAM_BOT_TOKEN, '123:from-file');
      assert.deepEqual(describeEnvValue('TELEGRAM_BOT_TOKEN'), { source: 'env-file', envFile: envPath, shadowsEnvFile: false });
      delete process.env.AI_CLI_COMPLETE_NOTIFY_ENV_PATH;
      delete process.env.TELEGRAM_BOT_TOKEN;
      bootstrapEnv();
      assert.equal(process.env.TELEGRAM_BOT_TOKEN, '123:from-file');
      assert.equal(describeEnvValue('TELEGRAM_BOT_TOKEN').source, 'env-file');
    `;
    const result = spawnSync(process.execPath, ['-e', script, envPath], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
