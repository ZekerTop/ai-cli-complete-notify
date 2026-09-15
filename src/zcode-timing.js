const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { getDataDir } = require('./paths');

function trackZcodeTurn(payload) {
  if (!['UserPromptSubmit', 'Stop'].includes(payload?.hook_event_name)) return null;
  const session = payload.session_id || payload.sessionId || process.env.ZCODE_SESSION_ID || process.env.CLAUDE_SESSION_ID;
  if (!session) return null;
  const cwd = payload.cwd || process.env.ZCODE_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const key = createHash('sha256').update(JSON.stringify([cwd, session])).digest('hex');
  const dir = path.join(getDataDir(), 'zcode-timing');
  const file = path.join(dir, `${key}.json`);
  if (payload.hook_event_name === 'UserPromptSubmit') {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ startedAt: Date.now() }));
    return null;
  }
  let turn;
  try {
    turn = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
  if (!Number.isFinite(turn.startedAt)) return null;
  // Keep the first Stop time so repeated Stop events cannot cross the threshold later.
  if (!Number.isFinite(turn.stoppedAt)) {
    turn.stoppedAt = Date.now();
    fs.writeFileSync(file, JSON.stringify(turn));
  }
  return { startedAt: turn.startedAt, durationMs: Math.max(0, turn.stoppedAt - turn.startedAt) };
}

module.exports = { trackZcodeTurn };
