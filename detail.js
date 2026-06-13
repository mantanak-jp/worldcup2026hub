const dataFiles = {
  matches: { path: "data/matches.json" },
  teams: { path: "data/teams.json" },
  resultReports: { path: "data/result_reports.json" },
  tacticalReviews: { path: "data/tactical_reviews.json" },
  sources: { path: "data/sources.json" },
  updateHistory: { path: "data/update_history.json" },
  generatedMatchReviews: { path: "data/generated_match_reviews.json", optional: true, fallback: [] }
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
    return "キックオフ未定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function scoreText(score) {
  if (!score || score.home === null || score.away === null) {
    return "スコア未定";
  }

  return `${score.home} - ${score.away}`;
}

function listItems(items, emptyText = "まだありません") {
  if (!items || items.length === 0) {
    return `<li>${escapeHtml(emptyText)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(dataFiles).map(async ([key, config]) => {
      const response = await fetch(config.path);

      if (!response.ok) {
        if (config.optional && response.status === 404) {
          return [key, config.fallback];
        }

        throw new Error(`Failed to load ${config.path}: ${response.status}`);
      }

      return [key, await response.json()];
    })
  );

  return Object.fromEntries(entries);
}

function renderError(error) {
  console.error(error);
  const shell = document.querySelector("[data-detail-shell]");
  shell.innerHTML = `<section class="panel message-panel"><p class="eyebrow">読み込みエラー</p><h1>詳細データを読み込めませんでした</h1><p>JSONファイルの状態を確認してください。</p></section>`;
}

function renderFallback(message) {
  const shell = document.querySelector("[data-detail-shell]");
  shell.innerHTML = `<section class="panel message-panel"><p class="eyebrow">見つかりません</p><h1>${escapeHtml(message)}</h1><p>トップページに戻り、別のカードを選んでください。</p></section>`;
}

function sourceList(sourceIds, sources) {
  const sourceMap = byId(sources);
  const items = (sourceIds || []).map((id) => sourceMap.get(id)).filter(Boolean);

  if (items.length === 0) {
    return "<li>参照ソースはまだありません</li>";
  }

  return items.map((source) => `
    <li>
      <a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a>
      <p>${escapeHtml(source.source_type)} / ${escapeHtml(source.language)} / ${escapeHtml(source.checked_status)}</p>
      <p>${escapeHtml(source.japanese_note || "メモはまだありません")}</p>
    </li>
  `).join("");
}

function updateHistoryList(records) {
  if (!records || records.length === 0) {
    return "<li>更新履歴はまだありません</li>";
  }

  return records.map((record) => `
    <li>
      <strong>${escapeHtml(record.status)}</strong>
      <p>${escapeHtml(record.summary)}</p>
      <p>${escapeHtml(record.updated_at || "更新時刻未定")} / ${escapeHtml(record.updated_by || "unknown")}</p>
    </li>
  `).join("");
}

function formatPercent(value) {
  if (typeof value !== "number") {
    return "TBD";
  }

  return `${Math.round(value * 100)}%`;
}

function formatSourceCoverage(coverage) {
  if (!coverage || typeof coverage !== "object") {
    return [
      ["カバレッジ", "未定"],
      ["ソース数", "0"],
      ["記事数", "0"],
      ["言語", "未定"]
    ];
  }

  return [
    ["カバレッジ", coverage.coverage_level || "未定"],
    ["ソース数", String(coverage.source_count ?? 0)],
    ["記事数", String(coverage.article_count ?? 0)],
    ["言語", (coverage.languages || []).join(", ") || "未定"]
  ];
}

function statusLabel(status) {
  const labels = {
    auto_draft: "自動生成ドラフト",
    auto_published: "自動公開済み",
    auto_updated: "自動更新済み",
    low_confidence: "信頼度低め",
    insufficient_sources: "ソース不足",
    not_generated: "未生成",
    failed: "生成失敗"
  };

  return labels[status] || status || "Unknown";
}

function statusHelp(status) {
  if (status === "auto_published") {
    return "承認済みの自動化が動作した後、このレビューは自動公開対象になり得ます。";
  }

  if (status === "low_confidence") {
    return "このレビューは表示されていますが、信頼度が低いためソース数と根拠を確認してください。";
  }

  if (status === "insufficient_sources") {
    return "このレビューは、ソースカバレッジがまだ十分でない sample / early draft です。";
  }

  return "レビュー品質を判断できるよう、生成状態を表示しています。";
}

function metricItems(items) {
  return items.map(([label, value]) => `
    <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
  `).join("");
}

function reviewStatusClass(status) {
  if (status === "auto_published") {
    return "status-pill status-good";
  }

  if (status === "low_confidence" || status === "insufficient_sources") {
    return "status-pill status-warn";
  }

  return "status-pill";
}

function renderGeneratedReview(data, matchId) {
  const panel = document.querySelector("[data-generated-review-panel]");

  if (!panel) {
    return;
  }

  const review = (data.generatedMatchReviews || []).find((item) => item.match_id === matchId);

  if (!review) {
    panel.innerHTML = `
      <p class="eyebrow">生成レビュー</p>
      <h2>生成レビューはまだありません</h2>
      <p>承認済みのローカル生成処理でこの試合のレビューデータが作成されると、ここに表示されます。</p>
    `;
    return;
  }

  panel.innerHTML = `
    <p class="eyebrow">生成レビュー</p>
    <div class="review-heading">
      <h2>${escapeHtml(review.title_ja || "生成レビュー")}</h2>
      <span class="${reviewStatusClass(review.status)}">${escapeHtml(statusLabel(review.status))}</span>
    </div>
    <p class="review-status-note">${escapeHtml(statusHelp(review.status))}</p>
    <p>${escapeHtml(review.short_summary_ja || "短い要約はまだありません")}</p>
    <h3 class="review-subhead">ソースカバレッジ</h3>
    <dl class="metric-list">
      ${metricItems(formatSourceCoverage(review.source_coverage))}
      <div><dt>信頼度</dt><dd>${escapeHtml(formatPercent(review.confidence))}</dd></div>
      <div><dt>生成バージョン</dt><dd>${escapeHtml(review.generation_version || "未定")}</dd></div>
      <div><dt>生成日時</dt><dd>${escapeHtml(review.generated_at || "未定")}</dd></div>
    </dl>
    <p class="review-status-note">信頼度は、現在利用できる構造化ソースと抽出メモに基づくローカルな品質目安であり、正確性を保証するものではありません。</p>
    <div class="review-sections">
      <section><h3>試合の流れ</h3><p>${escapeHtml(review.match_flow_ja || "試合の流れはまだありません")}</p></section>
      <section><h3>初期配置</h3><p>${escapeHtml(review.initial_shapes_ja || "初期配置メモはまだありません")}</p></section>
      <section><h3>主な戦術テーマ</h3><p>${escapeHtml(review.key_tactical_themes_ja || "戦術テーマはまだありません")}</p></section>
      <section><h3>転機</h3><p>${escapeHtml(review.turning_points_ja || "転機はまだありません")}</p></section>
      <section><h3>ソース間の一致点</h3><p>${escapeHtml(review.source_consensus_ja || "一致点メモはまだありません")}</p></section>
      <section><h3>ソース間の相違点</h3><p>${escapeHtml(review.source_disagreement_ja || "相違点メモはまだありません")}</p></section>
    </div>
    <section class="missing-inputs">
      <h3>不足している入力</h3>
      <ul class="detail-list">${listItems(review.missing_inputs, "不足入力の記録はありません")}</ul>
    </section>
    <details class="review-footnote">
      <summary>入力レコードID</summary>
      <p>Source IDs: ${escapeHtml((review.source_ids || []).join(", ") || "なし")}</p>
      <p>Article IDs: ${escapeHtml((review.article_ids || []).join(", ") || "なし")}</p>
    </details>
  `;
}

function renderMatch(data, id) {
  const match = data.matches.find((item) => item.id === id);

  if (!match) {
    renderFallback(`試合が見つかりません: ${id || "id未指定"}`);
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

  document.querySelector("[data-match-group]").textContent = `${match.group || "グループ未定"} / ${match.stage}`;
  document.querySelector("[data-match-title]").textContent = `${home?.name || match.home_team_id} vs ${away?.name || match.away_team_id}`;
  document.querySelector("[data-match-meta]").textContent = `${formatDate(match.kickoff)} / ${match.venue_id}`;
  document.querySelector("[data-match-status]").textContent = match.status;
  document.querySelector("[data-match-score]").textContent = scoreText(match.score);
  document.querySelector("[data-result-status]").textContent = report?.status || "not_started";
  document.querySelector("[data-result-headline]").textContent = report?.headline || "見出しはまだありません";
  document.querySelector("[data-result-summary]").textContent = report?.summary_ja || "結果サマリーはまだありません";
  document.querySelector("[data-result-events]").innerHTML = listItems(report?.key_events, "主要イベントはまだありません");
  document.querySelector("[data-review-status]").textContent = review?.status || "not_started";
  document.querySelector("[data-review-themes]").innerHTML = listItems(review?.themes, "戦術テーマはまだありません");
  document.querySelector("[data-review-summary]").textContent = review?.summary_ja || "戦術サマリーはまだありません";
  document.querySelector("[data-review-formation]").textContent = review?.formation_notes || "配置メモはまだありません";
  renderGeneratedReview(data, match.id);
  document.querySelector("[data-source-list]").innerHTML = sourceList([...sourceIds], data.sources);
  document.querySelector("[data-update-history]").innerHTML = updateHistoryList(history);
}

function renderTeam(data, id) {
  const team = data.teams.find((item) => item.id === id);

  if (!team) {
    renderFallback(`チームが見つかりません: ${id || "id未指定"}`);
    return;
  }

  const teams = byId(data.teams);
  const relatedMatches = data.matches.filter(
    (match) => match.home_team_id === team.id || match.away_team_id === team.id
  );
  const history = data.updateHistory.filter(
    (record) => record.target_type === "team" && record.target_id === team.id
  );

  document.querySelector("[data-team-group]").textContent = `グループ ${team.group}`;
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
    : "<li>関連試合はまだありません</li>";
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

    renderFallback("不明な詳細ページです");
  } catch (error) {
    renderError(error);
  }
}

init();
