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
    return "Kickoff TBD";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function scoreText(score) {
  if (!score || score.home === null || score.away === null) {
    return "Score TBD";
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
      target.innerHTML = `<p class="notice error">Unable to load site data. Please check the JSON files and try again.</p>`;
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
        <p class="eyebrow">${match.group || match.stage}</p>
        <h3>${home} vs ${away}</h3>
        <p class="meta">${formatDate(match.kickoff)} / ${match.venue_id}</p>
        <p class="meta">${match.status} / ${scoreText(match.score)}</p>
        <div class="pill-row">
          <span class="pill warning">Result: ${report?.status || "not_started"}</span>
          <span class="pill review">Review: ${review?.status || "not_started"}</span>
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
        <p class="eyebrow">Group ${team.group}</p>
        <h3>${team.name}</h3>
        <p class="meta">${team.short_name} / ${team.confederation}</p>
        <div class="pill-row">
          <span class="pill">${team.status}</span>
          <span class="pill warning">${team.profile_status}</span>
          <span class="pill review">${relatedMatches.length} matches</span>
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
  const latestUpdate = data.updateHistory[0]?.summary || "No updates recorded yet";

  const statusItems = [
    { label: "Matches", value: `${data.matches.length} records` },
    { label: "Teams", value: `${data.teams.length} records` },
    { label: "Reports", value: `${reportDrafts} pending` },
    { label: "Reviews", value: `${reviewDrafts} pending` },
    { label: "Sources", value: `${sourceReviewCount} need review` },
    { label: "Latest update", value: latestUpdate }
  ];

  target.innerHTML = statusItems.map((item) => `
    <article class="card">
      <h3>${item.label}</h3>
      <p class="meta">${item.value}</p>
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
