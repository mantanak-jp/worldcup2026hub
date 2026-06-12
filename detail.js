const dataFiles = {
  matches: "data/matches.json",
  teams: "data/teams.json",
  resultReports: "data/result_reports.json",
  tacticalReviews: "data/tactical_reviews.json",
  sources: "data/sources.json",
  updateHistory: "data/update_history.json"
};

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

function safeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch (error) {
    console.error(error);
    return "#";
  }
}

function getIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function formatDate(value) {
  if (!value) {
    return "Kickoff TBD";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function scoreText(score) {
  if (!score || score.home === null || score.away === null) {
    return "Score TBD";
  }

  return `${score.home} - ${score.away}`;
}

function listItems(items, emptyText = "None yet") {
  if (!items || items.length === 0) {
    return `<li>${escapeHtml(emptyText)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
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
  const shell = document.querySelector("[data-detail-shell]");
  shell.innerHTML = `<section class="panel message-panel"><p class="eyebrow">Load error</p><h1>Unable to load detail data</h1><p>Please check the JSON files and try again.</p></section>`;
}

function renderFallback(message) {
  const shell = document.querySelector("[data-detail-shell]");
  shell.innerHTML = `<section class="panel message-panel"><p class="eyebrow">Not found</p><h1>${escapeHtml(message)}</h1><p>Return to the top page and choose another card.</p></section>`;
}

function sourceList(sourceIds, sources) {
  const sourceMap = byId(sources);
  const items = (sourceIds || []).map((id) => sourceMap.get(id)).filter(Boolean);

  if (items.length === 0) {
    return "<li>No reference sources yet</li>";
  }

  return items.map((source) => `
    <li>
      <a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>
      <p>${escapeHtml(source.source_type)} / ${escapeHtml(source.language)} / ${escapeHtml(source.checked_status)}</p>
      <p>${escapeHtml(source.japanese_note || "No note yet")}</p>
    </li>
  `).join("");
}

function updateHistoryList(records) {
  if (!records || records.length === 0) {
    return "<li>No update history yet</li>";
  }

  return records.map((record) => `
    <li>
      <strong>${escapeHtml(record.status)}</strong>
      <p>${escapeHtml(record.summary)}</p>
      <p>${escapeHtml(record.updated_at || "Updated time TBD")} / ${escapeHtml(record.updated_by || "unknown")}</p>
    </li>
  `).join("");
}

function renderMatch(data, id) {
  const match = data.matches.find((item) => item.id === id);

  if (!match) {
    renderFallback(`Match not found: ${id || "missing id"}`);
    return;
  }

  const teams = byId(data.teams);
  const reports = byId(data.resultReports);
  const reviews = byId(data.tacticalReviews);
  const home = teams.get(match.home_team_id);
  const away = teams.get(match.away_team_id);
  const report = reports.get(match.result_report_id);
  const review = reviews.get(match.tactical_review_id);
  const history = data.updateHistory.filter(
    (record) => record.target_type === "match" && record.target_id === match.id
  );
  const sourceIds = new Set([
    ...(match.source_ids || []),
    ...(report?.source_ids || []),
    ...(review?.source_ids || [])
  ]);

  document.querySelector("[data-match-group]").textContent = `${match.group || "Group TBD"} / ${match.stage}`;
  document.querySelector("[data-match-title]").textContent = `${home?.name || match.home_team_id} vs ${away?.name || match.away_team_id}`;
  document.querySelector("[data-match-meta]").textContent = `${formatDate(match.kickoff)} / ${match.venue_id}`;
  document.querySelector("[data-match-status]").textContent = match.status;
  document.querySelector("[data-match-score]").textContent = scoreText(match.score);
  document.querySelector("[data-result-status]").textContent = report?.status || "not_started";
  document.querySelector("[data-result-headline]").textContent = report?.headline || "No headline yet";
  document.querySelector("[data-result-summary]").textContent = report?.summary_ja || "No result summary yet";
  document.querySelector("[data-result-events]").innerHTML = listItems(report?.key_events, "No key events yet");
  document.querySelector("[data-review-status]").textContent = review?.status || "not_started";
  document.querySelector("[data-review-themes]").innerHTML = listItems(review?.themes, "No tactical themes yet");
  document.querySelector("[data-review-summary]").textContent = review?.summary_ja || "No tactical summary yet";
  document.querySelector("[data-review-formation]").textContent = review?.formation_notes || "No formation notes yet";
  document.querySelector("[data-source-list]").innerHTML = sourceList([...sourceIds], data.sources);
  document.querySelector("[data-update-history]").innerHTML = updateHistoryList(history);
}

function renderTeam(data, id) {
  const team = data.teams.find((item) => item.id === id);

  if (!team) {
    renderFallback(`Team not found: ${id || "missing id"}`);
    return;
  }

  const teams = byId(data.teams);
  const relatedMatches = data.matches.filter(
    (match) => match.home_team_id === team.id || match.away_team_id === team.id
  );
  const history = data.updateHistory.filter(
    (record) => record.target_type === "team" && record.target_id === team.id
  );

  document.querySelector("[data-team-group]").textContent = `Group ${team.group}`;
  document.querySelector("[data-team-name]").textContent = team.name;
  document.querySelector("[data-team-meta]").textContent = `${team.short_name} / ${team.confederation}`;
  document.querySelector("[data-team-status]").textContent = team.status;
  document.querySelector("[data-team-profile-status]").textContent = team.profile_status;
  document.querySelector("[data-team-matches]").innerHTML = relatedMatches.length
    ? relatedMatches.map((match) => {
      const home = teams.get(match.home_team_id)?.name || match.home_team_id;
      const away = teams.get(match.away_team_id)?.name || match.away_team_id;
      return `<li><a href="match.html?id=${encodeURIComponent(match.id)}">${escapeHtml(home)} vs ${escapeHtml(away)}</a><p>${escapeHtml(formatDate(match.kickoff))} / ${escapeHtml(match.status)}</p></li>`;
    }).join("")
    : "<li>No related matches yet</li>";
  document.querySelector("[data-source-list]").innerHTML = sourceList(team.source_ids, data.sources);
  document.querySelector("[data-update-history]").innerHTML = updateHistoryList(history);
}

async function init() {
  try {
    const data = await loadData();
    const id = getIdFromUrl();
    const page = document.body.dataset.page;

    if (page === "match") {
      renderMatch(data, id);
      return;
    }

    if (page === "team") {
      renderTeam(data, id);
      return;
    }

    renderFallback("Unknown detail page");
  } catch (error) {
    renderError(error);
  }
}

init();
