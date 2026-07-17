import { mkdir, writeFile } from "node:fs/promises";

const repo = process.env.GITHUB_REPOSITORY || "ZekerTop/ai-cli-complete-notify";
const githubToken = process.env.GITHUB_TOKEN || "";
const outputDir = new URL("../../assets/star-history/", import.meta.url);

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ai-cli-complete-notify-star-history",
      ...headers,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
};

const fetchRepo = async () => {
  const url = `https://api.github.com/repos/${repo}`;

  if (githubToken) {
    try {
      return await fetchJson(url, { Authorization: `Bearer ${githubToken}` });
    } catch (error) {
      console.warn(`Authenticated repository request failed: ${error.message}`);
    }
  }

  return fetchJson(url);
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const niceCeil = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
};

const formatDate = (timestamp) => new Date(timestamp).toISOString().slice(0, 7);

const buildChart = (points, theme, updatedDate) => {
  const width = 800;
  const height = 520;
  const margin = { top: 82, right: 42, bottom: 74, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const minTime = points[0].timestamp;
  const maxTime = points.at(-1).timestamp;
  const timeRange = Math.max(maxTime - minTime, 1);
  const maxStars = niceCeil(Math.max(...points.map((point) => point.stars)));
  const latest = points.at(-1);
  const palette = theme === "dark"
    ? {
        background: "#0d1117",
        border: "#30363d",
        grid: "#30363d",
        text: "#f0f6fc",
        muted: "#8b949e",
        accent: "#58a6ff",
      }
    : {
        background: "#ffffff",
        border: "#d0d7de",
        grid: "#d8dee4",
        text: "#1f2328",
        muted: "#656d76",
        accent: "#0969da",
      };

  const x = (timestamp) => margin.left + ((timestamp - minTime) / timeRange) * plotWidth;
  const y = (stars) => margin.top + plotHeight - (stars / maxStars) * plotHeight;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.timestamp).toFixed(2)} ${y(point.stars).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(maxTime).toFixed(2)} ${(margin.top + plotHeight).toFixed(2)} L ${x(minTime).toFixed(2)} ${(margin.top + plotHeight).toFixed(2)} Z`;

  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const stars = (maxStars / 5) * index;
    const position = y(stars);
    return `
      <line x1="${margin.left}" y1="${position}" x2="${width - margin.right}" y2="${position}" stroke="${palette.grid}" stroke-width="1" />
      <text x="${margin.left - 12}" y="${position + 4}" text-anchor="end" fill="${palette.muted}" font-size="12">${Math.round(stars)}</text>`;
  }).join("");

  const xTickCount = Math.min(6, points.length);
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    const timestamp = minTime + (timeRange * index) / Math.max(xTickCount - 1, 1);
    const position = x(timestamp);
    const anchor = index === 0 ? "start" : index === xTickCount - 1 ? "end" : "middle";
    return `
      <line x1="${position}" y1="${margin.top}" x2="${position}" y2="${margin.top + plotHeight}" stroke="${palette.grid}" stroke-width="1" stroke-dasharray="3 5" />
      <text x="${position}" y="${margin.top + plotHeight + 28}" text-anchor="${anchor}" fill="${palette.muted}" font-size="12">${formatDate(timestamp)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">Star History for ${escapeXml(repo)}</title>
  <desc id="description">${escapeXml(repo)} has ${latest.stars} stars as of ${updatedDate}.</desc>
  <rect width="${width}" height="${height}" rx="8" fill="${palette.background}" stroke="${palette.border}" />
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
    <text x="${margin.left}" y="38" fill="${palette.text}" font-size="24" font-weight="600">Star History</text>
    <text x="${margin.left}" y="62" fill="${palette.muted}" font-size="14">${escapeXml(repo)}</text>
    <text x="${width - margin.right}" y="40" text-anchor="end" fill="${palette.accent}" font-size="26" font-weight="700">${latest.stars}</text>
    <text x="${width - margin.right}" y="61" text-anchor="end" fill="${palette.muted}" font-size="12">stars</text>
${yTicks}
${xTicks}
    <path d="${areaPath}" fill="${palette.accent}" opacity="0.12" />
    <path d="${linePath}" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${x(latest.timestamp)}" cy="${y(latest.stars)}" r="5" fill="${palette.background}" stroke="${palette.accent}" stroke-width="3" />
    <text x="${margin.left}" y="${height - 22}" fill="${palette.muted}" font-size="11">Source: OSS Insight and GitHub</text>
    <text x="${width - margin.right}" y="${height - 22}" text-anchor="end" fill="${palette.muted}" font-size="11">Updated ${updatedDate} UTC</text>
  </g>
</svg>
`;
};

const history = await fetchJson(
  `https://api.ossinsight.io/v1/repos/${repo}/stargazers/history`,
);
const repoData = await fetchRepo();
const rows = history?.data?.rows;

if (!Array.isArray(rows) || rows.length === 0) {
  throw new Error("OSS Insight returned no star history rows");
}

const points = rows.map((row) => ({
  timestamp: Date.parse(`${row.date}T00:00:00Z`),
  stars: Number(row.stargazers),
}));
const updatedDate = new Date().toISOString().slice(0, 10);
const currentPoint = {
  timestamp: Date.parse(`${updatedDate}T00:00:00Z`),
  stars: Number(repoData.stargazers_count),
};

if (!Number.isFinite(currentPoint.stars)) {
  throw new Error("GitHub returned an invalid stargazers_count");
}

const existingIndex = points.findIndex((point) => point.timestamp === currentPoint.timestamp);
if (existingIndex >= 0) {
  points[existingIndex] = currentPoint;
} else {
  points.push(currentPoint);
}
points.sort((left, right) => left.timestamp - right.timestamp);

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(new URL("star-history-light.svg", outputDir), buildChart(points, "light", updatedDate)),
  writeFile(new URL("star-history-dark.svg", outputDir), buildChart(points, "dark", updatedDate)),
]);

console.log(`Generated Star History charts for ${repo} (${currentPoint.stars} stars).`);
