const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath, fallback) {
  const fullPath = path.join(root, relativePath);

  if (!fs.existsSync(fullPath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function teamName(teamMap, id) {
  return teamMap.get(id)?.name || id;
}

function claimsForMatch(claims, matchId) {
  return (claims || []).filter((claim) => claim.match_id === matchId);
}

function extractionsForMatch(extractions, matchId) {
  return (extractions || []).filter((extraction) => extraction.match_id === matchId);
}

function outlineForMatch(outlines, matchId) {
  return (outlines || []).find((outline) => outline.match_id === matchId);
}

function buildSourceCoverage(outline, tacticalClaims, articleExtractions, articleMap) {
  const extractionArticleIds = unique(articleExtractions.map((extraction) => extraction.article_id));
  const extractionSourceIds = unique(extractionArticleIds.map((articleId) => articleMap.get(articleId)?.source_id));
  const claimSourceIds = unique(tacticalClaims.flatMap((claim) => claim.supporting_source_ids || []));
  const claimArticleIds = unique(tacticalClaims.flatMap((claim) => claim.supporting_article_ids || []));
  const languages = unique([
    ...(outline?.source_coverage?.languages || []),
    ...articleExtractions.map((extraction) => extraction.language)
  ]);
  const sourceCount = Math.max(outline?.source_coverage?.source_count ?? 0, unique([...claimSourceIds, ...extractionSourceIds]).length);
  const articleCount = Math.max(outline?.source_coverage?.article_count ?? 0, unique([...claimArticleIds, ...extractionArticleIds]).length);

  return {
    source_count: sourceCount,
    article_count: articleCount,
    languages,
    coverage_level: outline?.source_coverage?.coverage_level || (sourceCount >= 2 && articleCount >= 2 ? "partial" : "insufficient_sources")
  };
}

function confidenceFor(outline, tacticalClaims, articleExtractions) {
  if (typeof outline?.confidence === "number") {
    return outline.confidence;
  }

  if (tacticalClaims.length === 0) {
    return 0.2;
  }

  const extractionConfidence = articleExtractions
    .map((extraction) => extraction.confidence)
    .filter((value) => typeof value === "number");

  if (extractionConfidence.length === 0) {
    return 0.4;
  }

  const average = extractionConfidence.reduce((sum, value) => sum + value, 0) / extractionConfidence.length;
  return Number(((average + 0.4) / 2).toFixed(2));
}

function buildReview(match, teams, claims, outline, articleExtractions, articleMap) {
  const tacticalClaims = claimsForMatch(claims, match.id);
  const sourceCoverage = buildSourceCoverage(outline, tacticalClaims, articleExtractions, articleMap);
  const confidence = confidenceFor(outline, tacticalClaims, articleExtractions);
  const publishable = sourceCoverage.coverage_level !== "insufficient_sources" && confidence >= 0.6;
  const home = teamName(teams, match.home_team_id);
  const away = teamName(teams, match.away_team_id);
  const claimTexts = tacticalClaims.map((claim) => claim.claim_text_ja || claim.claim_ja).filter(Boolean);
  const extractionNotes = articleExtractions.map((extraction) => extraction.short_notes_ja).filter(Boolean);
  const articleIds = unique([
    ...tacticalClaims.flatMap((claim) => claim.supporting_article_ids || []),
    ...articleExtractions.map((extraction) => extraction.article_id)
  ]);
  const sourceIds = unique([
    ...tacticalClaims.flatMap((claim) => claim.supporting_source_ids || []),
    ...articleIds.map((articleId) => articleMap.get(articleId)?.source_id)
  ]);
  const missingInputs = unique([
    ...(outline?.missing_inputs || []),
    ...tacticalClaims.flatMap((claim) => claim.missing_inputs || []),
    ...articleExtractions.flatMap((extraction) => extraction.missing_inputs || []),
    ...(tacticalClaims.length === 0 ? ["tactical claims"] : []),
    ...(articleExtractions.length === 0 ? ["article extractions"] : [])
  ]);

  return {
    id: `generated-${match.id}-dry-run`,
    match_id: match.id,
    generation_run_id: "local-dry-run",
    status: publishable ? "auto_draft" : "insufficient_sources",
    title_ja: `${home} vs ${away} 自動レビュー dry-run`,
    short_summary_ja: "ローカルJSONだけから生成した検証用レビューです。外部API、ネットワーク、secrets、記事本文保存は使いません。",
    match_flow_ja: `${home} と ${away} の試合展開は、source-based claim と extraction note が増えた段階で更新します。`,
    initial_shapes_ja: "初期配置は、複数ソースで確認できた構造化claimのみを採用します。",
    key_tactical_themes_ja: claimTexts.length ? claimTexts.join(" / ") : extractionNotes.join(" / ") || "十分な戦術claimがまだありません。",
    turning_points_ja: "転機は試合後の複数ソース照合後に抽出します。",
    key_players_ja: "キープレーヤーは複数ソースで確認できた言及のみ採用します。",
    substitutions_and_adjustments_ja: "交代策と修正は、source-based claim が揃った段階で整理します。",
    source_consensus_ja: "一致点は複数ソースで同じ論点が確認できた場合に記録します。",
    source_disagreement_ja: "相違点はソース間で評価が分かれた場合に明示します。",
    next_match_implications_ja: "次戦への示唆は低confidence時には断定しません。",
    source_coverage: sourceCoverage,
    confidence,
    generated_at: new Date("2026-06-12T00:00:00.000Z").toISOString(),
    generation_version: "dry-run-v2",
    source_ids: sourceIds,
    article_ids: articleIds,
    missing_inputs: missingInputs,
    notes: "Local deterministic dry-run. No external API, network access, secrets, article body, or image storage."
  };
}

function main() {
  const matches = readJson("data/matches.json", []);
  const teams = byId(readJson("data/teams.json", []));
  const claims = readJson("data/tactical_claims.json", []);
  const outlines = readJson("data/review_outlines.json", []);
  const articles = readJson("data/articles.json", []);
  const extractions = readJson("data/article_extractions.json", []);
  const match = matches.find((item) => item.id === process.argv[2]) || matches[0];

  if (!match) {
    throw new Error("No matches found in data/matches.json");
  }

  const review = buildReview(
    match,
    teams,
    claims,
    outlineForMatch(outlines, match.id),
    extractionsForMatch(extractions, match.id),
    byId(articles)
  );
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

main();
