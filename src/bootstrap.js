const fs = require('fs');
const path = require('path');
const { getEnvPathCandidates } = require('./paths');

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

    if (firstExisting) require('dotenv').config({ path: firstExisting, quiet: true });
    else require('dotenv').config({ quiet: true });
  } catch (error) {
    // dotenv 失败时不阻断主流程
  }
}

module.exports = {
  bootstrapEnv
};
