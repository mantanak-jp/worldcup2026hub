const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function teamName(teamMap, id) {
  return teamMap.get(id)?.name || id;
}

function claimsForMatch(claims, matchId) {
  return (claims || []).filter((claim) => claim.match_id === matchId);
}

function outlineForMatch(outlines, matchId) {
  return (outlines || []).find((outline) => outline.match_id === matchId);
}

function buildReview(match, teams, claims, outline) {
  const home = teamName(teams, match.home_team_id);
  const away = teamName(teams, match.away_team_id);
  const tacticalClaims = claimsForMatch(claims, match.id);
  const sourceCoverage = outline?.source_coverage ?? (tacticalClaims.length > 0 ? 0.35 : 0.1);
  const confidence = outline?.confidence ?? (tacticalClaims.length > 0 ? 0.4 : 0.2);
  const themes = tacticalClaims.map((claim) => claim.claim_ja).filter(Boolean);

  return {
    id: `generated-${match.id}-dry-run`,
    match_id: match.id,
    generation_run_id: "local-dry-run",
    status: sourceCoverage >= 0.6 && confidence >= 0.6 ? "auto_draft" : "insufficient_sources",
    title_ja: `${home} vs ${away} 自動レビュー dry-run`,
    short_summary_ja: "このレビューは外部APIやネットワークを使わず、ローカルJSONだけから生成した検証用サンプルです。",
    match_flow_ja: `${home} と ${away} の試合展開は、現時点ではサンプルデータに基づく仮説整理に留めます。`,
    initial_shapes_ja: "初期配置はソース由来の構造化claimが十分に集まった段階で確定します。",
    key_tactical_themes_ja: themes.length ? themes.join(" / ") : "十分な戦術claimがまだありません。",
    turning_points_ja: "転機は試合後の複数ソース照合後に抽出します。",
    key_players_ja: "キープレーヤーは複数ソースで確認できた言及のみ採用します。",
    substitutions_and_adjustments_ja: "交代策と修正は、source-based claim が揃った段階で整理します。",
    source_consensus_ja: "一致点は複数ソースで同じ論点が確認できた場合に記録します。",
    source_disagreement_ja: "相違点はソース間で評価が分かれた場合に明示します。",
    next_match_implications_ja: "次戦への示唆は低confidence時には断定しません。",
    source_coverage: sourceCoverage,
    confidence,
    generated_at: new Date("2026-06-12T00:00:00.000Z").toISOString(),
    generation_version: "dry-run-v1",
    source_ids: [...new Set(tacticalClaims.flatMap((claim) => claim.supporting_source_ids || []))],
    article_ids: [...new Set(tacticalClaims.flatMap((claim) => claim.supporting_article_ids || []))],
    notes: "Local deterministic dry-run. No external API, network access, secrets, article body, or image storage."
  };
}

function main() {
  const matches = readJson("data/matches.json", []);
  const teams = byId(readJson("data/teams.json", []));
  const claims = readJson("data/tactical_claims.json", []);
  const outlines = readJson("data/review_outlines.json", []);
  const match = matches.find((item) => item.id === process.argv[2]) || matches[0];

  if (!match) {
    throw new Error("No matches found in data/matches.json");
  }

  const review = buildReview(match, teams, claims, outlineForMatch(outlines, match.id));
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

main();
