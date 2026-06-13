const {
  buildContext,
  buildGeneratedReviews,
  stableStringify
} = require("./review_pipeline_lib");

function main() {
  const context = buildContext();
  const matchId = process.argv[2] || "match-001";
  const review = buildGeneratedReviews(context).find((item) => item.match_id === matchId);

  if (!review) {
    process.stdout.write(stableStringify({
      match_id: matchId,
      status: "not_generated",
      notes: "No deterministic generated review is available for this match."
    }));
    return;
  }

  process.stdout.write(stableStringify(review));
}

main();
