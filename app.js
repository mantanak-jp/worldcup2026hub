const matches = [
  {
    id: "match-001",
    group: "Group A",
    kickoff: "2026-06-11",
    home: "Canada",
    away: "Group A opponent",
    venue: "Venue TBD",
    resultStatus: "not started",
    reviewStatus: "not started"
  },
  {
    id: "match-002",
    group: "Group B",
    kickoff: "2026-06-12",
    home: "United States",
    away: "Group B opponent",
    venue: "Venue TBD",
    resultStatus: "not started",
    reviewStatus: "not started"
  },
  {
    id: "match-003",
    group: "Group C",
    kickoff: "2026-06-13",
    home: "Mexico",
    away: "Group C opponent",
    venue: "Venue TBD",
    resultStatus: "not started",
    reviewStatus: "not started"
  }
];

const teams = [
  { name: "Canada", group: "A", status: "profile draft" },
  { name: "United States", group: "B", status: "profile draft" },
  { name: "Mexico", group: "C", status: "profile draft" },
  { name: "Qualified teams", group: "TBD", status: "pending updates" }
];

const statusItems = [
  { label: "Match cards", value: "Ready for sample data" },
  { label: "Result reports", value: "Status fields prepared" },
  { label: "Tactical reviews", value: "Status fields prepared" },
  { label: "Source references", value: "Later phase" }
];

function renderMatches() {
  const target = document.querySelector("[data-match-list]");
  target.innerHTML = matches.map((match) => `
    <article class="card">
      <p class="eyebrow">${match.group}</p>
      <h3>${match.home} vs ${match.away}</h3>
      <p class="meta">${match.kickoff} / ${match.venue}</p>
      <div class="pill-row">
        <span class="pill warning">Result: ${match.resultStatus}</span>
        <span class="pill review">Review: ${match.reviewStatus}</span>
      </div>
    </article>
  `).join("");
}

function renderTeams() {
  const target = document.querySelector("[data-team-list]");
  target.innerHTML = teams.map((team) => `
    <article class="card">
      <p class="eyebrow">Group ${team.group}</p>
      <h3>${team.name}</h3>
      <p class="meta">${team.status}</p>
    </article>
  `).join("");
}

function renderStatus() {
  const target = document.querySelector("[data-status-board]");
  target.innerHTML = statusItems.map((item) => `
    <article class="card">
      <h3>${item.label}</h3>
      <p class="meta">${item.value}</p>
    </article>
  `).join("");
}

renderMatches();
renderTeams();
renderStatus();
