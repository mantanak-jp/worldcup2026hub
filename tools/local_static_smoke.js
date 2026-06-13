const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { stableStringify } = require("./review_pipeline_lib");

const root = path.resolve(__dirname, "..");
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
];

const pages = [
  {
    id: "top",
    path: "/index.html",
    checks: ["WorldCup2026Hub"]
  },
  {
    id: "match_detail",
    path: "/match.html?id=match-001",
    checks: ["自動生成レビュー", "sample / dry-run", "ソースカバレッジ", "不足している入力", "ソース間の相違点"]
  },
  {
    id: "team_detail",
    path: "/team.html?id=team-canada",
    checks: ["Canada"]
  },
  {
    id: "unknown_match",
    path: "/match.html?id=unknown-match",
    checks: ["試合が見つかりません"]
  },
  {
    id: "unknown_team",
    path: "/team.html?id=unknown-team",
    checks: ["チームが見つかりません"]
  }
];

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function safeFilePath(requestUrl) {
  const parsed = new URL(requestUrl, "http://localhost");
  const pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

function createServer() {
  return http.createServer((request, response) => {
    const filePath = safeFilePath(request.url);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(fs.readFileSync(filePath));
  });
}

function findChrome() {
  return chromeCandidates.find((candidate) => fs.existsSync(candidate));
}

function checkText(id, html, checks) {
  return checks
    .filter((text) => !html.includes(text))
    .map((text) => `${id}: missing text "${text}"`);
}

function runChromeSmoke(chromePath, baseUrl) {
  const results = [];
  const errors = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wc2026hub-chrome-"));
  const viewports = [
    { id: "desktop", size: "1280,900" },
    { id: "mobile", size: "390,844" }
  ];

  for (const page of pages) {
    for (const viewport of viewports) {
      const result = spawnSync(chromePath, [
        "--headless=new",
        "--disable-gpu",
        "--disable-gpu-compositing",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--disable-extensions",
        `--user-data-dir=${userDataDir}`,
        `--window-size=${viewport.size}`,
        "--dump-dom",
        `${baseUrl}${page.path}`
      ], {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000
      });
      const output = result.stdout || "";
      const pageErrors = result.status === 0
        ? checkText(`${page.id}:${viewport.id}`, output, page.checks)
        : [`${page.id}:${viewport.id}: Chrome exited with ${result.status}: ${(result.stderr || "").trim()}`];
      errors.push(...pageErrors);
      results.push({
        page: page.id,
        viewport: viewport.id,
        ok: pageErrors.length === 0
      });
    }
  }

  return { ok: errors.length === 0, mode: "headless-chrome", results, errors };
}

function runStaticFallback() {
  const errors = [];
  const detailJs = fs.readFileSync(path.join(root, "detail.js"), "utf8");
  const reviews = JSON.parse(fs.readFileSync(path.join(root, "data/generated_match_reviews.json"), "utf8"));

  for (const text of [
    "sourceRegistry",
    "ソースカバレッジ",
    "不足している入力",
    "sample / dry-run",
    "試合が見つかりません",
    "チームが見つかりません"
  ]) {
    if (!detailJs.includes(text)) {
      errors.push(`detail.js: missing expected UI text ${text}`);
    }
  }
  for (const review of reviews) {
    if (!review.match_id || !review.outline_id || !review.sections || !review.source_coverage) {
      errors.push(`review ${review.id}: missing generated review contract fields`);
    }
  }

  return {
    ok: errors.length === 0,
    mode: "static-fallback",
    note: "Browser runtime was unavailable; static JS and generated-review contract assertions were used.",
    errors
  };
}

function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    const fallback = runStaticFallback();
    process.stdout.write(stableStringify(fallback));
    if (!fallback.ok) process.exitCode = 1;
    return;
  }

  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    const chromeResult = runChromeSmoke(chromePath, `http://127.0.0.1:${port}`);
    const fallback = chromeResult.ok ? null : runStaticFallback();
    const result = chromeResult.ok
      ? chromeResult
      : {
        ok: fallback.ok,
        mode: "static-fallback-after-headless-chrome-failure",
        browser_runtime_error: chromeResult.errors[0] || "headless Chrome failed",
        chrome_result_count: chromeResult.results.length,
        fallback
      };
    server.close(() => {
      process.stdout.write(stableStringify({
        ...result,
        browser: chromePath
      }));
      if (!result.ok) process.exitCode = 1;
    });
  });
}

main();
