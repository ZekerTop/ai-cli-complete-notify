const fs = require('fs');
const path = require('path');
const { getEnvPathCandidates } = require('./paths');

let loadedEnvPath = '';
let loadedValues = {};
let inheritedKeys = new Set();
let explicitEnv = false;

function bootstrapEnv() {
  try {
    const explicit =
      process.env.AI_CLI_COMPLETE_NOTIFY_ENV_PATH ||
      process.env.AICLI_COMPLETE_NOTIFY_ENV_PATH ||
      process.env.TASKPULSE_ENV_PATH ||
      process.env.AI_REMINDER_ENV_PATH ||
      '';
    const candidates = [];
    if (explicit) candidates.push(path.resolve(explicit));
    candidates.push(...getEnvPathCandidates());
    candidates.push(path.join(__dirname, '..', '.env'));

    const firstExisting = candidates.find((p) => {
      try {
        return p && fs.existsSync(p);
      } catch (error) {
        return false;
      }
    });

    inheritedKeys = new Set(Object.keys(process.env));
    explicitEnv = Boolean(explicit) && firstExisting === path.resolve(explicit);
    const result = require('dotenv').config({
      ...(firstExisting ? { path: firstExisting } : {}),
      override: explicitEnv,
      quiet: true
    });
    loadedEnvPath = result.error ? '' : (firstExisting || path.join(process.cwd(), '.env'));
    loadedValues = result.parsed || {};
  } catch (error) {
    // dotenv 失败时不阻断主流程
  }
}

function describeEnvValue(name) {
  const fromFile = Object.prototype.hasOwnProperty.call(loadedValues, name);
  return {
    source: fromFile && (explicitEnv || !inheritedKeys.has(name)) ? 'env-file' : 'process-environment',
    envFile: loadedEnvPath,
    shadowsEnvFile: fromFile && !explicitEnv && inheritedKeys.has(name)
      && String(process.env[name] || '').trim() !== String(loadedValues[name] || '').trim()
  };
}

module.exports = {
  bootstrapEnv,
  describeEnvValue
};
