const fs = require("fs");
const path = require("path");

function readJson(relativePath, fallback) {
  const filePath = path.join(__dirname, "..", relativePath);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function main() {
  const matches = readJson("data/matches.json", []);
  const claims = readJson("data/tactical_claims.json", []);
  const outlines = readJson("data/review_outlines.json", []);
  const match = matches.find((item) => item.id === "match-001") || matches[0];

  if (!match) {
    console.log("No match data available for sample generation.");
    return;
  }

  const claimMap = byId(claims);
  const outline = outlines.find((item) => item.match_id === match.id);
  const tacticalThemeIds = outline?.section_claims?.key_tactical_themes || [];
  const tacticalThemes = tacticalThemeIds
    .map((id) => claimMap.get(id)?.claim_ja)
    .filter(Boolean);

  const review = {
    match_id: match.id,
    status: outline?.status || "auto_draft",
    title_ja: `Level 3構造化レビュー案: ${match.id}`,
    short_summary_ja: tacticalThemes.length
      ? tacticalThemes.join(" ")
      : "戦術論点の入力が不足しています。",
    source_coverage: outline?.source_coverage || { coverage_level: "insufficient_sources" },
    confidence: outline?.confidence ?? 0,
    generation_version: outline?.generation_version || "level3-outline-v0"
  };

  console.log(JSON.stringify(review, null, 2));
}

main();
