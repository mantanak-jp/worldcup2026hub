const {
  ALLOWED_STATUSES,
  OUTLINE_REQUIRED_FIELDS,
  PRIMARY_SECTION_FIELD_NAMES,
  PROHIBITED_CONTENT_FIELDS,
  SECTION_FIELD_NAMES,
  SECTION_ORDER,
  buildContext,
  buildOutlines,
  ids,
  isDisagreementClaim,
  refsForClaims,
  stableStringify,
  unique
} = require("./review_pipeline_lib");

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

function requireArray(kind, record, field, errors) {
  if (!Array.isArray(record[field])) {
    errors.push(`${kind} ${record.id}: ${field} must be an array`);
  }
}

function compareJson(kind, id, field, actual, expected, errors) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${kind} ${id}: ${field} must equal deterministic value ${JSON.stringify(expected)}`);
  }
}

function validateOutline(outline, context, expectedOutline, errors) {
  requireFields("outline", outline, OUTLINE_REQUIRED_FIELDS, errors);
  scanProhibited("outline", outline, errors);

  for (const field of ["claim_ids", "section_order", "missing_inputs", "uncertainty", ...SECTION_FIELD_NAMES]) {
    requireArray("outline", outline, field, errors);
  }

  if (!context.matchIds.has(outline.match_id)) {
    errors.push(`outline ${outline.id}: match_id references missing match ${outline.match_id}`);
  }
  if (!ALLOWED_STATUSES.has(outline.status)) {
    errors.push(`outline ${outline.id}: unsupported status ${outline.status}`);
  }

  const claimIdSet = context.claimIds;
  for (const claimId of outline.claim_ids || []) {
    const claim = context.claimMap.get(claimId);
    if (!claimIdSet.has(claimId)) {
      errors.push(`outline ${outline.id}: claim_ids references missing claim ${claimId}`);
    } else if (claim.match_id !== outline.match_id) {
      errors.push(`outline ${outline.id}: claim ${claimId} belongs to different match ${claim.match_id}`);
    }
  }

  for (const field of SECTION_FIELD_NAMES) {
    for (const claimId of outline[field] || []) {
      const claim = context.claimMap.get(claimId);
      if (!claimIdSet.has(claimId)) {
        errors.push(`outline ${outline.id}: ${field} references missing claim ${claimId}`);
      } else if (claim.match_id !== outline.match_id) {
        errors.push(`outline ${outline.id}: ${field} claim ${claimId} belongs to different match ${claim.match_id}`);
      }
      if (!(outline.claim_ids || []).includes(claimId)) {
        errors.push(`outline ${outline.id}: ${field} claim ${claimId} is not listed in claim_ids`);
      }
    }
  }

  const primaryRefs = PRIMARY_SECTION_FIELD_NAMES.flatMap((field) => outline[field] || []);
  for (const duplicate of duplicateValues(primaryRefs.map((id) => ({ id })), (item) => item.id)) {
    errors.push(`outline ${outline.id}: claim ${duplicate} appears in multiple primary sections`);
  }

  for (const claimId of outline.disagreement_claim_ids || []) {
    const claim = context.claimMap.get(claimId);
    if (claim && !isDisagreementClaim(claim)) {
      errors.push(`outline ${outline.id}: disagreement_claim_ids includes non-disagreement claim ${claimId}`);
    }
  }
  for (const claimId of outline.claim_ids || []) {
    const claim = context.claimMap.get(claimId);
    if (claim && isDisagreementClaim(claim) && !(outline.disagreement_claim_ids || []).includes(claimId)) {
      errors.push(`outline ${outline.id}: disagreement claim ${claimId} missing from disagreement_claim_ids`);
    }
  }

  compareJson("outline", outline.id, "section_order", outline.section_order, SECTION_ORDER, errors);
  compareJson("outline", outline.id, "claim_ids", outline.claim_ids, expectedOutline.claim_ids, errors);
  for (const field of SECTION_FIELD_NAMES) {
    compareJson("outline", outline.id, field, outline[field], expectedOutline[field], errors);
  }
  compareJson("outline", outline.id, "source_coverage", outline.source_coverage, expectedOutline.source_coverage, errors);
  compareJson("outline", outline.id, "confidence_factors", outline.confidence_factors, expectedOutline.confidence_factors, errors);
  compareJson("outline", outline.id, "missing_inputs", outline.missing_inputs, expectedOutline.missing_inputs, errors);
  compareJson("outline", outline.id, "uncertainty", outline.uncertainty, expectedOutline.uncertainty, errors);

  if (outline.confidence !== expectedOutline.confidence) {
    errors.push(`outline ${outline.id}: confidence must be deterministic value ${expectedOutline.confidence}`);
  }
  if (outline.status !== expectedOutline.status) {
    errors.push(`outline ${outline.id}: status must be deterministic value ${expectedOutline.status}`);
  }
  if (outline.generation_version !== expectedOutline.generation_version) {
    errors.push(`outline ${outline.id}: generation_version must be ${expectedOutline.generation_version}`);
  }
  if (outline.generation_stability_key !== expectedOutline.generation_stability_key) {
    errors.push(`outline ${outline.id}: generation_stability_key must be ${expectedOutline.generation_stability_key}`);
  }
}

function validateOutlines(outlines, context) {
  const errors = [];
  if (!Array.isArray(outlines)) {
    return ["data/review_outlines.json: root must be an array"];
  }
  for (const outline of outlines) {
    if (!outline.id) {
      errors.push("outline: record missing id");
    }
  }
  for (const id of duplicateValues(outlines, (outline) => outline.id)) {
    errors.push(`outline: duplicate id ${id}`);
  }
  for (const matchId of duplicateValues(outlines, (outline) => outline.match_id)) {
    errors.push(`outline: duplicate match_id ${matchId}`);
  }

  const expectedMap = new Map(buildOutlines(context).map((outline) => [outline.match_id, outline]));
  for (const outline of outlines) {
    const expected = expectedMap.get(outline.match_id);
    if (!expected) {
      errors.push(`outline ${outline.id}: no deterministic outline can be generated for match ${outline.match_id}`);
      continue;
    }
    validateOutline(outline, context, expected, errors);
  }
  return errors.sort();
}

function summarize(outlines, errors, context) {
  const outlineClaims = outlines.flatMap((outline) => outline.claim_ids || []).map((id) => context.claimMap.get(id)).filter(Boolean);
  const refs = refsForClaims(outlineClaims);
  return {
    outline_count: outlines.length,
    linked_claim_count: unique(outlines.flatMap((outline) => outline.claim_ids || [])).length,
    linked_source_count: refs.sourceIds.length,
    linked_article_count: refs.articleIds.length,
    validation_error_count: errors.length,
    errors,
    statuses: unique(outlines.map((outline) => outline.status)),
    notes: "Local-only review outline validation. No crawler, external API, paid API, secrets, article body, or image storage."
  };
}

function runNegativeSelfTest(context) {
  const base = buildOutlines(context);
  const otherClaim = {
    ...context.claims[0],
    id: "negative-other-match-claim",
    match_id: "match-002",
    duplicate_key: "negative-other-match-claim"
  };
  const cases = [
    {
      name: "missing claim",
      outlines: [{ ...base[0], claim_ids: ["missing-claim"] }]
    },
    {
      name: "claim from another match",
      outlines: [{ ...base[0], claim_ids: [otherClaim.id], transition_claim_ids: [otherClaim.id] }],
      contextPatch: { claims: [...context.claims, otherClaim] }
    },
    {
      name: "duplicate outline ID",
      outlines: [base[0], { ...base[0] }]
    },
    {
      name: "disagreement mismatch",
      outlines: [{ ...base[0], disagreement_claim_ids: [] }]
    },
    {
      name: "confidence mismatch",
      outlines: [{ ...base[0], confidence: 0.99 }]
    },
    {
      name: "source coverage mismatch",
      outlines: [{ ...base[0], source_coverage: { ...base[0].source_coverage, source_count: 99 } }]
    },
    {
      name: "prohibited content field",
      outlines: [{ ...base[0], full_text: "not allowed" }]
    }
  ];

  const results = cases.map((testCase) => {
    const patchedContext = testCase.contextPatch
      ? { ...context, ...testCase.contextPatch, claimMap: new Map(testCase.contextPatch.claims.map((claim) => [claim.id, claim])), claimIds: ids(testCase.contextPatch.claims) }
      : context;
    const errors = validateOutlines(testCase.outlines, patchedContext);
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

  const errors = validateOutlines(context.outlines, context);
  process.stdout.write(stableStringify(summarize(context.outlines, errors, context)));
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
