export const LATEST_RELEASE_API_URL =
  'https://api.github.com/repos/ZekerTop/ai-cli-complete-notify/releases/latest';
export const RELEASES_URL = 'https://github.com/ZekerTop/ai-cli-complete-notify/releases';

export type UpdateCheckStatus = 'update-available' | 'up-to-date' | 'ahead';

export interface UpdateCheckResult {
  status: UpdateCheckStatus;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<FetchResponse>;

function parseStableVersion(value: string) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) return null;

  const parts = match.slice(1).map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) return null;

  return {
    normalized: parts.join('.'),
    parts,
  };
}

export function compareStableVersions(currentVersion: string, latestVersion: string) {
  const current = parseStableVersion(currentVersion);
  const latest = parseStableVersion(latestVersion);
  if (!current || !latest) return null;

  for (let index = 0; index < current.parts.length; index += 1) {
    if (current.parts[index] < latest.parts[index]) return -1;
    if (current.parts[index] > latest.parts[index]) return 1;
  }

  return 0;
}

function normalizeReleaseUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
    if (!url.pathname.startsWith('/ZekerTop/ai-cli-complete-notify/releases/')) return null;
    return url.toString();
  } catch (_error) {
    return null;
  }
}

export async function checkLatestRelease(
  currentVersion: string,
  fetchImpl: FetchLike = globalThis.fetch as FetchLike,
): Promise<UpdateCheckResult> {
  const current = parseStableVersion(currentVersion);
  if (!current) throw new Error('Invalid current version');

  const response = await fetchImpl(LATEST_RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`GitHub release request failed: ${response.status}`);

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('Invalid GitHub release payload');

  const tagName = 'tag_name' in payload ? payload.tag_name : null;
  const releaseUrlValue = 'html_url' in payload ? payload.html_url : null;
  const latest = typeof tagName === 'string' ? parseStableVersion(tagName) : null;
  const releaseUrl = normalizeReleaseUrl(releaseUrlValue);
  if (!latest || !releaseUrl) throw new Error('Invalid GitHub release payload');

  const comparison = compareStableVersions(current.normalized, latest.normalized);
  if (comparison === null) throw new Error('Invalid release version');

  return {
    status: comparison < 0 ? 'update-available' : comparison > 0 ? 'ahead' : 'up-to-date',
    currentVersion: current.normalized,
    latestVersion: latest.normalized,
    releaseUrl,
  };
}
