#!/usr/bin/env node

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { runCli } = require('./src/cli');

async function main() {
  const result = await runCli(process.argv.slice(2));
  if (typeof result.exitCode === 'number') {
    process.exit(result.exitCode);
  }
  if (!result.ok) {
    console.error(result.error || '运行失败');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('运行失败:', error && error.message ? error.message : error);
  process.exit(1);
});
