const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readJson(relativePath, fallback) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function main() {
  const matches = readJson("data/matches.json", []);
  const claims = readJson("data/tactical_claims.json", []);
  const outlines = readJson("data/review_outlines.json", []);
  const extractions = readJson("data/article_extractions.json", []);
  const match = matches.find((item) => item.id === "match-001") || matches[0];

  if (!match) {
    console.log("No match data available for sample generation.");
    return;
  }

  const claimMap = byId(claims);
  const outline = outlines.find((item) => item.match_id === match.id);
  const matchExtractions = extractions.filter((item) => item.match_id === match.id);
  const tacticalThemeIds = outline?.section_claims?.key_tactical_themes || [];
  const tacticalThemes = tacticalThemeIds
    .map((id) => claimMap.get(id)?.claim_ja)
    .filter(Boolean);
  const extractionNotes = matchExtractions.map((item) => item.short_notes_ja).filter(Boolean);

  const review = {
    match_id: match.id,
    status: outline?.status || "insufficient_sources",
    title_ja: `Level 3構造化レビュー案: ${match.id}`,
    short_summary_ja: tacticalThemes.length
      ? tacticalThemes.join(" ")
      : extractionNotes.join(" ") || "戦術論点の入力が不足しています。",
    source_coverage: outline?.source_coverage || {
      source_count: 0,
      article_count: matchExtractions.length,
      languages: unique(matchExtractions.map((item) => item.language)),
      coverage_level: "insufficient_sources"
    },
    confidence: outline?.confidence ?? 0,
    missing_inputs: unique([
      ...(outline?.missing_inputs || []),
      ...matchExtractions.flatMap((item) => item.missing_inputs || []),
      ...(matchExtractions.length === 0 ? ["article extractions"] : [])
    ]),
    generation_version: outline?.generation_version || "level3-outline-v1"
  };

  console.log(JSON.stringify(review, null, 2));
}

main();
