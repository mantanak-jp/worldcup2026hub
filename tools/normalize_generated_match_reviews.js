const {
  ALLOWED_STATUSES,
  PROHIBITED_CONTENT_FIELDS,
  REVIEW_REQUIRED_FIELDS,
  SECTION_ORDER,
  buildContext,
  buildGeneratedReviews,
  refsForClaims,
  stableStringify,
  unique
} = require("./review_pipeline_lib");

const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 280;
const MAX_SECTION_BODY_LENGTH = 520;

function duplicateValues(items, keyFn) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items || []) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }
  return [...duplicates].sort();
}

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

function requireFields(kind, record, fields, errors) {
  for (const field of fields) {
    if (!(field in record)) {
      errors.push(`${kind} ${record.id || "(missing id)"}: missing required field ${field}`);
    }
  }
}

function checkArray(kind, record, field, errors) {
  if (!Array.isArray(record[field])) {
    errors.push(`${kind} ${record.id}: ${field} must be an array`);
  }
}

function checkRefs(kind, recordId, field, refs, validIds, errors) {
  for (const ref of refs || []) {
    if (!validIds.has(ref)) {
      errors.push(`${kind} ${recordId}: ${field} references missing id ${ref}`);
    }
  }
}

function compareJson(kind, id, field, actual, expected, errors) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${kind} ${id}: ${field} must equal deterministic value ${JSON.stringify(expected)}`);
  }
}

function sourceIds(context) {
  return new Set([
    ...context.sources.map((source) => source.id),
    ...context.sourceRegistry.map((source) => source.id)
  ]);
}

function articleIds(context) {
  return new Set(context.articles.map((article) => article.id));
}

function validateSectionShape(review, errors) {
  if (!review.sections || typeof review.sections !== "object" || Array.isArray(review.sections)) {
    errors.push(`review ${review.id}: sections must be an object`);
    return;
  }

  const sectionKeys = Object.keys(review.sections).sort();
  compareJson("review", review.id, "section keys", sectionKeys, [...SECTION_ORDER].sort(), errors);

  for (const key of SECTION_ORDER) {
    const section = review.sections[key];
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      errors.push(`review ${review.id}: section ${key} must be an object`);
      continue;
    }
    if (!Array.isArray(section.claim_ids)) {
      errors.push(`review ${review.id}: section ${key}.claim_ids must be an array`);
    }
    if (typeof section.body_ja !== "string") {
      errors.push(`review ${review.id}: section ${key}.body_ja must be a string`);
    }
    if (key !== "limitations" && (section.claim_ids || []).length === 0 && section.body_ja) {
      errors.push(`review ${review.id}: section ${key} has body_ja without supporting claim_ids`);
    }
    if (typeof section.body_ja === "string" && section.body_ja.length > MAX_SECTION_BODY_LENGTH) {
      errors.push(`review ${review.id}: section ${key}.body_ja is too long for local synthesis`);
    }
  }
}

function validateReview(review, context, expected, errors) {
  requireFields("review", review, REVIEW_REQUIRED_FIELDS, errors);
  scanProhibited("review", review, errors);

  for (const field of ["missing_inputs", "uncertainty", "source_ids", "article_ids", "claim_ids"]) {
    checkArray("review", review, field, errors);
  }

  if (!context.matchIds.has(review.match_id)) {
    errors.push(`review ${review.id}: match_id references missing match ${review.match_id}`);
  }
  if (!ALLOWED_STATUSES.has(review.status)) {
    errors.push(`review ${review.id}: unsupported status ${review.status}`);
  }
  if (review.status === "auto_published" && (review.source_coverage?.approved_source_policy_count || 0) === 0) {
    errors.push(`review ${review.id}: auto_published requires approved source policy coverage`);
  }
  if (review.status === "auto_published" && review.source_coverage?.coverage_level === "insufficient_sources") {
    errors.push(`review ${review.id}: auto_published cannot use insufficient_sources coverage`);
  }

  const outline = context.outlines.find((item) => item.id === review.outline_id);
  if (!outline) {
    errors.push(`review ${review.id}: outline_id references missing outline ${review.outline_id}`);
    return;
  }
  if (outline.match_id !== review.match_id) {
    errors.push(`review ${review.id}: match_id must match outline match_id ${outline.match_id}`);
  }
  if (outline.status === "insufficient_sources" && review.status !== "insufficient_sources") {
    errors.push(`review ${review.id}: insufficient outline cannot produce status ${review.status}`);
  }

  checkRefs("review", review.id, "claim_ids", review.claim_ids, context.claimIds, errors);
  checkRefs("review", review.id, "source_ids", review.source_ids, sourceIds(context), errors);
  checkRefs("review", review.id, "article_ids", review.article_ids, articleIds(context), errors);

  const claimRecords = (review.claim_ids || []).map((id) => context.claimMap.get(id)).filter(Boolean);
  const refs = refsForClaims(claimRecords);
  compareJson("review", review.id, "claim_ids", review.claim_ids, outline.claim_ids, errors);
  compareJson("review", review.id, "source_ids", review.source_ids, refs.sourceIds, errors);
  compareJson("review", review.id, "article_ids", review.article_ids, refs.articleIds, errors);
  compareJson("review", review.id, "source_coverage", review.source_coverage, outline.source_coverage, errors);
  compareJson("review", review.id, "missing_inputs", review.missing_inputs, outline.missing_inputs, errors);
  compareJson("review", review.id, "uncertainty", review.uncertainty, outline.uncertainty, errors);

  if (review.confidence !== outline.confidence) {
    errors.push(`review ${review.id}: confidence must match outline confidence ${outline.confidence}`);
  }
  if (review.status !== outline.status) {
    errors.push(`review ${review.id}: status must match outline status ${outline.status}`);
  }
  if (review.generation_version !== outline.generation_version) {
    errors.push(`review ${review.id}: generation_version must match outline generation_version ${outline.generation_version}`);
  }
  if (review.generation_stability_key !== `generated-${review.match_id}:${review.generation_version}`) {
    errors.push(`review ${review.id}: generation_stability_key must be generated-${review.match_id}:${review.generation_version}`);
  }

  const expectedDisagreement = (outline.disagreement_claim_ids || []).length > 0;
  if (expectedDisagreement && !review.disagreement_summary_ja) {
    errors.push(`review ${review.id}: disagreement_summary_ja is required when outline has disagreement claims`);
  }
  if (!expectedDisagreement && review.disagreement_summary_ja) {
    errors.push(`review ${review.id}: disagreement_summary_ja must be empty when outline has no disagreement claims`);
  }

  if (typeof review.title_ja !== "string" || review.title_ja.length === 0 || review.title_ja.length > MAX_TITLE_LENGTH) {
    errors.push(`review ${review.id}: title_ja must be non-empty and under ${MAX_TITLE_LENGTH} characters`);
  }
  if (typeof review.short_summary_ja !== "string" || review.short_summary_ja.length === 0 || review.short_summary_ja.length > MAX_SUMMARY_LENGTH) {
    errors.push(`review ${review.id}: short_summary_ja must be non-empty and under ${MAX_SUMMARY_LENGTH} characters`);
  }
  validateSectionShape(review, errors);

  for (const field of REVIEW_REQUIRED_FIELDS) {
    compareJson("review", review.id, field, review[field], expected[field], errors);
  }
}

function validateReviews(reviews, context) {
  const errors = [];
  if (!Array.isArray(reviews)) {
    return ["data/generated_match_reviews.json: root must be an array"];
  }
  for (const review of reviews) {
    if (!review.id) {
      errors.push("review: record missing id");
    }
  }
  for (const id of duplicateValues(reviews, (review) => review.id)) {
    errors.push(`review: duplicate id ${id}`);
  }
  for (const matchId of duplicateValues(reviews, (review) => review.match_id)) {
    errors.push(`review: duplicate match_id ${matchId}`);
  }

  const expectedMap = new Map(buildGeneratedReviews(context).map((review) => [review.id, review]));
  for (const review of reviews) {
    const expected = expectedMap.get(review.id);
    if (!expected) {
      errors.push(`review ${review.id}: no deterministic generated review exists`);
      continue;
    }
    validateReview(review, context, expected, errors);
  }
  return errors.sort();
}

function summarize(reviews, errors) {
  return {
    generated_review_count: reviews.length,
    linked_claim_count: unique(reviews.flatMap((review) => review.claim_ids || [])).length,
    linked_source_count: unique(reviews.flatMap((review) => review.source_ids || [])).length,
    linked_article_count: unique(reviews.flatMap((review) => review.article_ids || [])).length,
    validation_error_count: errors.length,
    errors,
    statuses: unique(reviews.map((review) => review.status)),
    notes: "Local-only generated review validation. No crawler, external API, paid API, secrets, article body, translated body, or image storage."
  };
}

function patchContext(context, overrides) {
  const next = { ...context, ...overrides };
  next.claimMap = new Map(next.claims.map((claim) => [claim.id, claim]));
  next.claimIds = new Set(next.claims.map((claim) => claim.id));
  return next;
}

function runNegativeSelfTest(context) {
  const base = buildGeneratedReviews(context);
  const cases = [
    {
      name: "invalid generated review ref",
      reviews: [{ ...base[0], outline_id: "missing-outline" }]
    },
    {
      name: "invalid claim ref",
      reviews: [{ ...base[0], claim_ids: ["missing-claim"] }]
    },
    {
      name: "confidence mismatch",
      reviews: [{ ...base[0], confidence: 0.99 }]
    },
    {
      name: "source coverage mismatch",
      reviews: [{ ...base[0], source_coverage: { ...base[0].source_coverage, source_count: 99 } }]
    },
    {
      name: "body without supporting claim",
      reviews: [{ ...base[0], sections: { ...base[0].sections, match_flow: { claim_ids: [], body_ja: "根拠なし本文" } } }]
    },
    {
      name: "prohibited content field",
      reviews: [{ ...base[0], translated_body: "not allowed" }]
    },
    {
      name: "auto published with unapproved sources",
      reviews: [{ ...base[0], status: "auto_published" }]
    }
  ];

  const results = cases.map((testCase) => {
    const patched = patchContext(context, testCase.contextPatch || {});
    const errors = validateReviews(testCase.reviews, patched);
    return {
      name: testCase.name,
      passed: errors.length > 0,
      observed_error_count: errors.length
    };
  });

  const failures = results.filter((result) => !result.passed);
  process.stdout.write(stableStringify({ negative_self_test: results, failure_count: failures.length }));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

function main() {
  const context = buildContext();
  if (process.argv.includes("--self-test-negative")) {
    runNegativeSelfTest(context);
    return;
  }

  const errors = validateReviews(context.generatedReviews, context);
  process.stdout.write(stableStringify(summarize(context.generatedReviews, errors)));
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
