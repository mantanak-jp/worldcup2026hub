const dataFiles = {
  matches: "data/matches.json",
  teams: "data/teams.json",
  resultReports: "data/result_reports.json",
  tacticalReviews: "data/tactical_reviews.json",
  sources: "data/sources.json",
  updateHistory: "data/update_history.json"
};

function formatDate(value) {
  if (!value) {
    return "キックオフ未定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function scoreText(score) {
  if (!score || score.home === null || score.away === null) {
    return "スコア未定";
  }

  return `${score.home} - ${score.away}`;
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(dataFiles).map(async ([key, path]) => {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }

      return [key, await response.json()];
    })
  );

  return Object.fromEntries(entries);
}

function renderError(error) {
  console.error(error);

  for (const selector of ["[data-match-list]", "[data-team-list]", "[data-status-board]"]) {
    const target = document.querySelector(selector);
    if (target) {
      target.innerHTML = `<p class="notice error">サイトデータを読み込めませんでした。JSONファイルの状態を確認してください。</p>`;
    }
  }
}

function renderMatches(data) {
  const target = document.querySelector("[data-match-list]");
  const teams = byId(data.teams);
  const reports = byId(data.resultReports);
  const reviews = byId(data.tacticalReviews);

  target.innerHTML = data.matches.map((match) => {
    const home = teams.get(match.home_team_id)?.name || match.home_team_id;
    const away = teams.get(match.away_team_id)?.name || match.away_team_id;
    const report = reports.get(match.result_report_id);
    const review = reviews.get(match.tactical_review_id);

    return `
      <a class="card card-link" href="match.html?id=${encodeURIComponent(match.id)}">
        <p class="eyebrow">${escapeHtml(match.group || match.stage)}</p>
        <h3>${escapeHtml(home)} vs ${escapeHtml(away)}</h3>
        <p class="meta">${escapeHtml(formatDate(match.kickoff))} / ${escapeHtml(match.venue_id)}</p>
        <p class="meta">${escapeHtml(match.status)} / ${escapeHtml(scoreText(match.score))}</p>
        <div class="pill-row">
          <span class="pill warning">結果: ${escapeHtml(report?.status || "not_started")}</span>
          <span class="pill review">レビュー: ${escapeHtml(review?.status || "not_started")}</span>
        </div>
      </a>
    `;
  }).join("");
}

function renderTeams(data) {
  const target = document.querySelector("[data-team-list]");

  target.innerHTML = data.teams.map((team) => {
    const relatedMatches = data.matches.filter(
      (match) => match.home_team_id === team.id || match.away_team_id === team.id
    );

    return `
      <a class="card card-link" href="team.html?id=${encodeURIComponent(team.id)}">
        <p class="eyebrow">グループ ${escapeHtml(team.group)}</p>
        <h3>${escapeHtml(team.name)}</h3>
        <p class="meta">${escapeHtml(team.short_name)} / ${escapeHtml(team.confederation)}</p>
        <div class="pill-row">
          <span class="pill">${escapeHtml(team.status)}</span>
          <span class="pill warning">${escapeHtml(team.profile_status)}</span>
          <span class="pill review">${escapeHtml(relatedMatches.length)} 試合</span>
        </div>
      </a>
    `;
  }).join("");
}

function renderStatus(data) {
  const target = document.querySelector("[data-status-board]");
  const reportDrafts = data.resultReports.filter((report) => report.status !== "published").length;
  const reviewDrafts = data.tacticalReviews.filter((review) => review.status !== "published").length;
  const sourceReviewCount = data.sources.filter((source) => source.checked_status !== "approved-reference").length;
  const latestUpdate = data.updateHistory[0]?.summary || "更新履歴はまだありません";

  const statusItems = [
    { label: "試合", value: `${data.matches.length} 件` },
    { label: "チーム", value: `${data.teams.length} 件` },
    { label: "結果レポート", value: `${reportDrafts} 件が準備中` },
    { label: "戦術レビュー", value: `${reviewDrafts} 件が準備中` },
    { label: "ソース確認", value: `${sourceReviewCount} 件が確認待ち` },
    { label: "最新更新", value: latestUpdate }
  ];

  target.innerHTML = statusItems.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.label)}</h3>
      <p class="meta">${escapeHtml(item.value)}</p>
    </article>
  `).join("");
}

async function init() {
  try {
    const data = await loadData();
    renderMatches(data);
    renderTeams(data);
    renderStatus(data);
  } catch (error) {
    renderError(error);
  }
}

init();
