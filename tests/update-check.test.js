const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', 'src-ui', 'lib', 'update-check.mts'),
).href;

async function loadUpdateCheck() {
  return import(moduleUrl);
}

function releaseResponse({
  ok = true,
  status = 200,
  tagName = 'v2.12.0',
  htmlUrl = 'https://github.com/ZekerTop/ai-cli-complete-notify/releases/tag/v2.12.0',
} = {}) {
  return {
    ok,
    status,
    json: async () => ({ tag_name: tagName, html_url: htmlUrl }),
  };
}

test('stable version comparison supports leading v and rejects malformed versions', async () => {
  const { compareStableVersions } = await loadUpdateCheck();

  assert.equal(compareStableVersions('2.11.0', 'v2.12.0'), -1);
  assert.equal(compareStableVersions('v2.11.0', '2.11.0'), 0);
  assert.equal(compareStableVersions('2.12.1', '2.12.0'), 1);
  assert.equal(compareStableVersions('2.11', '2.12.0'), null);
  assert.equal(compareStableVersions('2.11.0-beta.1', '2.12.0'), null);
});

test('release check returns update, current, and ahead states', async () => {
  const { checkLatestRelease, LATEST_RELEASE_API_URL } = await loadUpdateCheck();
  const requests = [];

  const update = await checkLatestRelease('2.11.0', async (url, init) => {
    requests.push({ url, init });
    return releaseResponse();
  });
  assert.equal(update.status, 'update-available');
  assert.equal(update.currentVersion, '2.11.0');
  assert.equal(update.latestVersion, '2.12.0');
  assert.equal(update.releaseUrl, 'https://github.com/ZekerTop/ai-cli-complete-notify/releases/tag/v2.12.0');
  assert.equal(requests[0].url, LATEST_RELEASE_API_URL);
  assert.equal(requests[0].init.headers.Accept, 'application/vnd.github+json');

  const current = await checkLatestRelease('v2.12.0', async () => releaseResponse());
  assert.equal(current.status, 'up-to-date');

  const ahead = await checkLatestRelease('2.13.0', async () => releaseResponse());
  assert.equal(ahead.status, 'ahead');
});

test('release check rejects network, HTTP, and invalid payload failures', async () => {
  const { checkLatestRelease } = await loadUpdateCheck();

  await assert.rejects(
    checkLatestRelease('invalid', async () => releaseResponse()),
    /Invalid current version/,
  );
  await assert.rejects(
    checkLatestRelease('2.11.0', async () => {
      throw new Error('offline');
    }),
    /offline/,
  );
  await assert.rejects(
    checkLatestRelease('2.11.0', async () => releaseResponse({ ok: false, status: 403 })),
    /403/,
  );
  await assert.rejects(
    checkLatestRelease('2.11.0', async () => releaseResponse({ tagName: 'latest' })),
    /Invalid GitHub release payload/,
  );
  await assert.rejects(
    checkLatestRelease('2.11.0', async () => releaseResponse({ htmlUrl: 'https://example.com/v2.12.0' })),
    /Invalid GitHub release payload/,
  );
});
