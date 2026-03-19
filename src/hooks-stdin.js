/**
 * Non-blocking stdin JSON reader for hook invocations.
 * Third-party CLIs (Claude Code, Gemini CLI) pipe a JSON payload via stdin
 * containing context such as cwd, session_id, etc.
 *
 * Reads with a short timeout to avoid blocking if nothing is piped.
 * Some packaged Windows exes may report `stdin.isTTY === true` even when data
 * is piped, so do not use that as an early exit signal here.
 */
function readStdinJson(timeoutMs) {
  const envTimeout = Number(process.env.HOOK_STDIN_TIMEOUT_MS);
  const fallbackTimeout = Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 1500;
  const timeout = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : fallbackTimeout;

  return new Promise((resolve) => {
    let data = '';
    let settled = false;

    const done = (result) => {
      if (settled) return;
      settled = true;
      try { process.stdin.removeAllListeners('data'); } catch (_e) { /* ignore */ }
      try { process.stdin.removeAllListeners('end'); } catch (_e) { /* ignore */ }
      try { process.stdin.removeAllListeners('error'); } catch (_e) { /* ignore */ }
      try { process.stdin.pause(); } catch (_e) { /* ignore */ }
      resolve(result);
    };

    const timer = setTimeout(() => {
      done(tryParse(data));
    }, timeout);

    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      done(tryParse(data));
    });

    process.stdin.on('error', () => {
      clearTimeout(timer);
      done(null);
    });
  });
}

function tryParse(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  readStdinJson
};
