const SOURCE_LABELS = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini'
};

function formatDurationMs(durationMs) {
  if (durationMs == null) return null;
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getSourceLabel(source) {
  return SOURCE_LABELS[source] || source || 'unknown';
}

function buildTitle({ projectName, taskInfo, sourceLabel, includeSourcePrefixInTitle }) {
  const base = projectName ? `${projectName}: ${taskInfo}` : taskInfo;
  if (!includeSourcePrefixInTitle) return base;
  return `[${sourceLabel}] ${base}`;
}

module.exports = {
  formatDurationMs,
  getSourceLabel,
  buildTitle
};
