const sample = {
  match: {
    group: "Group A",
    title: "Canada vs Group A opponent",
    meta: "2026-06-11 / Venue TBD",
    resultStatus: "Not started",
    reviewStatus: "Not started",
    sources: [
      {
        name: "FIFA Match Centre",
        url: "https://www.fifa.com/",
        note: "Official reference placeholder. Store metadata and link only."
      }
    ]
  },
  team: {
    group: "Group A",
    name: "Canada",
    meta: "CONCACAF / profile draft",
    matches: [
      "Canada vs Group A opponent",
      "Future group-stage matches"
    ],
    sources: [
      {
        name: "FIFA Teams",
        url: "https://www.fifa.com/",
        note: "Team reference placeholder. Store metadata and link only."
      }
    ]
  }
};

function renderSources(target, sources) {
  target.innerHTML = sources.map((source) => `
    <li>
      <a href="${source.url}">${source.name}</a>
      <p>${source.note}</p>
    </li>
  `).join("");
}

function renderMatch() {
  document.querySelector("[data-match-group]").textContent = sample.match.group;
  document.querySelector("[data-match-title]").textContent = sample.match.title;
  document.querySelector("[data-match-meta]").textContent = sample.match.meta;
  document.querySelector("[data-result-status]").textContent = sample.match.resultStatus;
  document.querySelector("[data-review-status]").textContent = sample.match.reviewStatus;
  renderSources(document.querySelector("[data-source-list]"), sample.match.sources);
}

function renderTeam() {
  document.querySelector("[data-team-group]").textContent = sample.team.group;
  document.querySelector("[data-team-name]").textContent = sample.team.name;
  document.querySelector("[data-team-meta]").textContent = sample.team.meta;
  document.querySelector("[data-team-matches]").innerHTML = sample.team.matches
    .map((match) => `<li>${match}</li>`)
    .join("");
  renderSources(document.querySelector("[data-source-list]"), sample.team.sources);
}

if (document.body.dataset.page === "match") {
  renderMatch();
}

if (document.body.dataset.page === "team") {
  renderTeam();
}
