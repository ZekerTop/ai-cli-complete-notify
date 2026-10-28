const fs = require('fs');
const path = require('path');
const { createHash, randomBytes } = require('crypto');
const { getDataDir } = require('./paths');

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

function removeOwner(claimDir, ownerName) {
  try {
    fs.unlinkSync(path.join(claimDir, ownerName));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    fs.rmdirSync(claimDir);
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
  }
}

function inspectClaim(claimDir, dedupeMs, leaseMs) {
  let entries;
  try {
    entries = fs.readdirSync(claimDir);
  } catch (error) {
    if (error.code === 'ENOENT') return 'available';
    throw error;
  }
  if (entries.length === 0) {
    try { fs.rmdirSync(claimDir); } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
    }
    return 'available';
  }
  const ownerName = entries.find((name) => /^owner-\d+-[a-f0-9]+\.json$/.test(name));
  if (!ownerName) throw new Error('Invalid Codex notification claim directory');
  const ownerPath = path.join(claimDir, ownerName);
  let owner;
  let stat;
  try {
    stat = fs.statSync(ownerPath);
    owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return 'available';
    if (!(error instanceof SyntaxError)) throw error;
  }
  const now = Date.now();
  if (owner?.status === 'success' && Number.isFinite(owner.completedAt)) {
    if (now - owner.completedAt < dedupeMs) return 'duplicate';
  } else if (now - stat.mtimeMs < leaseMs && (!owner || processIsAlive(owner.pid))) {
    return 'pending';
  }
  // Only remove the observed generation. Another contender may already own
  // this path; its different owner file keeps rmdir from removing its claim.
  removeOwner(claimDir, ownerName);
  return 'available';
}

async function acquireCodexNotificationClaim(dedupeKey, options = {}) {
  const dedupeMs = options.dedupeMs || 2 * 60 * 1000;
  const leaseMs = options.leaseMs || 3 * 60 * 1000;
  const pollMs = options.pollMs || 50;
  const root = path.join(getDataDir(), 'codex-notification-claims');
  const key = createHash('sha256').update(dedupeKey).digest('hex');
  const claimDir = path.join(root, key);
  fs.mkdirSync(root, { recursive: true });
  let renameRetries = 0;

  for (;;) {
    const state = inspectClaim(claimDir, dedupeMs, leaseMs);
    if (state === 'duplicate') return null;
    if (state === 'pending') {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }

    const token = randomBytes(16).toString('hex');
    const ownerName = `owner-${process.pid}-${token}.json`;
    const temporaryDir = path.join(root, `.${key}-${token}`);
    const owner = { pid: process.pid, status: 'pending' };
    fs.mkdirSync(temporaryDir);
    fs.writeFileSync(path.join(temporaryDir, ownerName), JSON.stringify(owner), { flag: 'wx' });
    try {
      // Rename a nonempty directory so acquisition has no empty-directory
      // window and can never replace another live owner's directory.
      fs.renameSync(temporaryDir, claimDir);
    } catch (error) {
      removeOwner(temporaryDir, ownerName);
      // Windows scanners and recently deleted handles can temporarily prevent
      // directory renames even after our own file has been closed.
      if (error.code === 'EPERM' && !fs.existsSync(claimDir) && renameRetries++ < 20) {
        await new Promise((resolve) => setTimeout(resolve, pollMs));
        continue;
      }
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)
        && !(error.code === 'EPERM' && fs.existsSync(claimDir))) throw error;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      continue;
    }

    const ownerPath = path.join(claimDir, ownerName);
    const ownsClaim = () => fs.existsSync(ownerPath);
    const heartbeat = setInterval(() => {
      if (!ownsClaim()) {
        clearInterval(heartbeat);
        return;
      }
      const now = new Date();
      try {
        fs.utimesSync(ownerPath, now, now);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        clearInterval(heartbeat);
      }
    }, Math.max(10, Math.floor(leaseMs / 3)));
    heartbeat.unref();
    let completed = false;

    return {
      complete(success) {
        if (completed) return false;
        completed = true;
        clearInterval(heartbeat);
        let fd;
        try {
          if (!ownsClaim()) return false;
          if (success) {
            const data = JSON.stringify({ ...owner, status: 'success', completedAt: Date.now() });
            // Keep handles short-lived so Windows can reclaim expired directories.
            try {
              fd = fs.openSync(ownerPath, 'r+');
            } catch (error) {
              if (error.code === 'ENOENT') return false;
              throw error;
            }
            // Write through our descriptor: a stale owner cannot update a
            // replacement generation, even if it resumes after lease expiry.
            fs.writeSync(fd, data, 0, 'utf8');
            fs.ftruncateSync(fd, Buffer.byteLength(data));
          } else {
            removeOwner(claimDir, ownerName);
          }
          return true;
        } finally {
          if (fd !== undefined) fs.closeSync(fd);
        }
      }
    };
  }
}

module.exports = { acquireCodexNotificationClaim };
