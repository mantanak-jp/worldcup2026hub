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

function average(values) {
  const valid = values.filter((value) => typeof value === "number");
  if (valid.length === 0) {
    return 0;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function main() {
  const articles = readJson("data/articles.json", []);
  const extractions = readJson("data/article_extractions.json", []);
  const claims = readJson("data/tactical_claims.json", []);
  const matches = readJson("data/matches.json", []);
  const articleMap = byId(articles);
  const claimMap = byId(claims);
  const matchMap = byId(matches);

  const missingArticleRefs = extractions
    .filter((extraction) => !articleMap.has(extraction.article_id))
    .map((extraction) => extraction.article_id);
  const missingClaimRefs = extractions.flatMap((extraction) =>
    (extraction.linked_claim_ids || []).filter((claimId) => !claimMap.has(claimId))
  );
  const linkedMatchIds = unique(extractions.map((extraction) => extraction.match_id));
  const missingMatchRefs = linkedMatchIds.filter((matchId) => !matchMap.has(matchId));
  const linkedClaimIds = unique(extractions.flatMap((extraction) => extraction.linked_claim_ids || []));
  const confidenceAverage = average(extractions.map((extraction) => extraction.confidence));

  const summary = {
    article_count: articles.length,
    extraction_count: extractions.length,
    linked_match_count: linkedMatchIds.length,
    linked_claim_count: linkedClaimIds.length,
    missing_article_refs: unique(missingArticleRefs),
    missing_match_refs: missingMatchRefs,
    missing_claim_refs: unique(missingClaimRefs),
    confidence_summary: {
      average: Number(confidenceAverage.toFixed(2)),
      low_count: extractions.filter((extraction) => (extraction.confidence ?? 0) < 0.4).length
    },
    notes: "Local-only validation summary. No network, external API, paid API, secrets, article body, or image storage."
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
