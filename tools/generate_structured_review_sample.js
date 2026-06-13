const {
  buildContext,
  buildGeneratedReviews,
  PROHIBITED_CONTENT_FIELDS,
  REVIEW_REQUIRED_FIELDS,
  refsForClaims,
  stableStringify
} = require("./review_pipeline_lib");

function scanProhibited(kind, record, errors, prefix = "", ownerId = record?.id) {
  if (!record || typeof record !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_CONTENT_FIELDS.has(key)) {
      errors.push(`${kind} ${ownerId || "(unknown)"}: prohibited content-like field ${fieldPath}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanProhibited(kind, value, errors, fieldPath, ownerId);
    }
  }
}

function validateGeneratedReviews(reviews, context, expectedReviews) {
  const errors = [];
  const expectedMap = new Map(expectedReviews.map((review) => [review.id, review]));
  const seenIds = new Set();

  for (const review of reviews) {
    if (seenIds.has(review.id)) {
      errors.push(`review: duplicate id ${review.id}`);
    }
    seenIds.add(review.id);

    for (const field of REVIEW_REQUIRED_FIELDS) {
      if (!(field in review)) {
        errors.push(`review ${review.id || "(missing id)"}: missing required field ${field}`);
      }
    }
    scanProhibited("review", review, errors);

    const outline = context.outlines.find((item) => item.id === review.outline_id);
    if (!outline) {
      errors.push(`review ${review.id}: outline_id references missing outline ${review.outline_id}`);
      continue;
    }
    if (review.match_id !== outline.match_id) {
      errors.push(`review ${review.id}: match_id must match outline match_id ${outline.match_id}`);
    }
    const claims = (review.claim_ids || []).map((id) => context.claimMap.get(id)).filter(Boolean);
    const refs = refsForClaims(claims);
    if (JSON.stringify(review.claim_ids) !== JSON.stringify(outline.claim_ids)) {
      errors.push(`review ${review.id}: claim_ids must match outline claim_ids`);
    }
    if (JSON.stringify(review.source_ids) !== JSON.stringify(refs.sourceIds)) {
      errors.push(`review ${review.id}: source_ids must match claim-derived refs ${JSON.stringify(refs.sourceIds)}`);
    }
    if (JSON.stringify(review.article_ids) !== JSON.stringify(refs.articleIds)) {
      errors.push(`review ${review.id}: article_ids must match claim-derived refs ${JSON.stringify(refs.articleIds)}`);
    }
    if (JSON.stringify(review.source_coverage) !== JSON.stringify(outline.source_coverage)) {
      errors.push(`review ${review.id}: source_coverage must match outline`);
    }
    if (review.confidence !== outline.confidence) {
      errors.push(`review ${review.id}: confidence must match outline`);
    }
    if (review.status !== outline.status) {
      errors.push(`review ${review.id}: status must match outline`);
    }
    const expected = expectedMap.get(review.id);
    if (!expected) {
      errors.push(`review ${review.id}: no deterministic generated review exists`);
      continue;
    }
    for (const field of REVIEW_REQUIRED_FIELDS) {
      if (JSON.stringify(review[field]) !== JSON.stringify(expected[field])) {
        errors.push(`review ${review.id}: ${field} must equal deterministic value`);
      }
    }
  }

  return errors.sort();
}

function main() {
  const context = buildContext();
  const matchId = process.argv.find((arg) => arg.startsWith("--match="))?.split("=")[1] || process.argv[2];
  const reviews = buildGeneratedReviews(context);

  if (process.argv.includes("--validate")) {
    const errors = validateGeneratedReviews(context.generatedReviews, context, reviews);
    process.stdout.write(stableStringify({
      generated_review_count: context.generatedReviews.length,
      validation_error_count: errors.length,
      errors,
      notes: "Saved generated review records are validated against deterministic outline, claim, source, and article refs."
    }));
    if (errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  const output = matchId ? reviews.find((review) => review.match_id === matchId) || null : reviews;
  process.stdout.write(stableStringify(output));
}

main();
