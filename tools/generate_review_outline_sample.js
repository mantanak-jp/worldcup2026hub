const { buildContext, buildOutlines, stableStringify } = require("./review_pipeline_lib");

function main() {
  const context = buildContext();
  const matchId = process.argv[2];
  const outlines = buildOutlines(context);
  const output = matchId ? outlines.filter((outline) => outline.match_id === matchId) : outlines;
  process.stdout.write(stableStringify(matchId ? output[0] || null : output));
}

main();
