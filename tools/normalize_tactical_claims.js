const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const REQUIRED_FIELDS = [
  "id",
  "match_id",
  "team_ids",
  "claim_type",
  "tactical_phase",
  "tactical_theme",
  "claim_text_ja",
  "supporting_extraction_ids",
  "supporting_article_ids",
  "supporting_source_ids",
  "opposing_extraction_ids",
  "opposing_article_ids",
  "opposing_source_ids",
  "confidence",
  "confidence_factors",
  "uncertainty",
  "disagreement_status",
  "missing_inputs",
  "duplicate_key",
  "generation_stability_key",
  "created_at",
  "updated_at",
  "status"
];

const ARRAY_FIELDS = [
  "team_ids",
  "supporting_extraction_ids",
  "supporting_article_ids",
  "supporting_source_ids",
  "opposing_extraction_ids",
  "opposing_article_ids",
  "opposing_source_ids",
  "missing_inputs"
];

const ALLOWED_CLAIM_TYPES = new Set([
  "tactical_observation",
  "match_flow",
  "initial_shape",
  "adjustment",
  "substitution_impact",
  "turning_point",
  "key_player_role",
  "source_disagreement"
]);
const ALLOWED_PHASES = new Set([
  "in_possession",
  "out_of_possession",
  "transition_attack",
  "transition_defense",
  "set_piece",
  "substitution",
  "game_state",
  "unknown"
]);
const ALLOWED_DISAGREEMENT = new Set(["none", "has_disagreement", "unresolved"]);
const ALLOWED_STATUS = new Set([
  "sample_low_confidence",
  "supported",
  "low_confidence",
  "insufficient_sources",
  "blocked"
]);
const PROHIBITED_CONTENT_FIELDS = new Set([
  "body",
  "content",
  "html",
  "raw_html",
  "full_text",
  "article_body",
  "translation",
  "translated_body",
  "image",
  "images",
  "image_url",
  "image_urls",
  "screenshot"
]);

function readJson(relativePath, fallback, warnings) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    warnings.push(`${relativePath}: file missing; using empty fallback`);
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${relativePath}: invalid JSON: ${error.message}`);
  }
}

function ensureArrayRoot(name, value, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${name}: root must be an array`);
    return [];
  }
  return value;
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function ids(items) {
  return new Set((items || []).map((item) => item.id).filter(Boolean));
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean))].sort();
}

function round2(value) {
  return Number(value.toFixed(2));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[。、，,.!！?？:：;；"'`()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

function deterministicClaimKey(claim) {
  return [
    claim.match_id,
    unique(claim.team_ids || []).join("+"),
    claim.tactical_phase,
    claim.tactical_theme,
    normalizeText(claim.claim_text_ja)
  ].join("|");
}

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

function scanProhibitedFields(kind, record, errors, prefix = "", ownerId = record?.id) {
  if (!record || typeof record !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_CONTENT_FIELDS.has(key)) {
      errors.push(`${kind} ${ownerId || "(unknown)"}: prohibited content-like field ${fieldPath}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanProhibitedFields(kind, value, errors, fieldPath, ownerId);
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

function checkArrayField(kind, record, field, errors) {
  if (!Array.isArray(record[field])) {
    errors.push(`${kind} ${record.id}: ${field} must be an array`);
  }
}

function checkReferences(kind, recordId, field, refs, validIds, errors) {
  for (const ref of refs || []) {
    if (!validIds.has(ref)) {
      errors.push(`${kind} ${recordId}: ${field} references missing id ${ref}`);
    }
  }
}

function extractionArticleIds(extraction) {
  return unique([extraction?.article_id, ...(extraction?.supporting_article_ids || [])]);
}

function extractionSourceIds(extraction) {
  return unique([extraction?.source_id, ...(extraction?.supporting_source_ids || [])]);
}

function opposingArticleIds(extraction) {
  return unique(extraction?.opposing_article_ids || []);
}

function opposingSourceIds(extraction) {
  return unique(extraction?.opposing_source_ids || []);
}

function sourcePolicyApproved(sourceId, sourceMap, sourceRegistryMap) {
  const source = sourceMap.get(sourceId);
  const registry = sourceRegistryMap.get(sourceId);

  return (
    source?.checked_status === "approved" ||
    source?.allowed_use === "metadata-and-link-only" ||
    registry?.allowed_use === "approved" ||
    registry?.robots_policy_status === "approved"
  );
}

function sourceTypeFor(sourceId, sourceMap, sourceRegistryMap, articleMap, articleIds) {
  const source = sourceMap.get(sourceId);
  const registry = sourceRegistryMap.get(sourceId);
  const articleType = articleIds
    .map((articleId) => articleMap.get(articleId))
    .find((article) => article?.source_id === sourceId)?.article_type;

  return source?.source_type || registry?.source_category?.[0] || articleType || "unknown";
}

function computeConfidenceFactors(claim, context) {
  const supportingArticles = unique(claim.supporting_article_ids || []);
  const supportingSources = unique(claim.supporting_source_ids || []);
  const supportingExtractions = unique(claim.supporting_extraction_ids || []);
  const supportingExtractionRecords = supportingExtractions
    .map((id) => context.extractionMap.get(id))
    .filter(Boolean);
  const supportingArticleRecords = supportingArticles
    .map((id) => context.articleMap.get(id))
    .filter(Boolean);
  const extractionConfidences = supportingExtractionRecords
    .map((extraction) => extraction.confidence)
    .filter((value) => typeof value === "number");
  const averageExtractionConfidence = extractionConfidences.length
    ? extractionConfidences.reduce((sum, value) => sum + value, 0) / extractionConfidences.length
    : 0;
  const evidenceLevels = supportingExtractionRecords.map(
    (extraction) => extraction.evidence_metadata?.evidence_level || extraction.extraction_status
  );
  const metadataOnly = supportingExtractionRecords.some((extraction) => extraction.evidence_metadata?.has_event_data === false);
  const sourceTypes = unique(
    supportingSources.map((sourceId) =>
      sourceTypeFor(sourceId, context.sourceMap, context.sourceRegistryMap, context.articleMap, supportingArticles)
    )
  );

  return {
    supporting_source_count: supportingSources.length,
    supporting_article_count: supportingArticles.length,
    supporting_extraction_count: supportingExtractions.length,
    language_count: unique([
      ...supportingArticleRecords.map((article) => article.language),
      ...supportingExtractionRecords.map((extraction) => extraction.language)
    ]).length,
    source_type_count: sourceTypes.length,
    has_approved_source_policy: supportingSources.some((sourceId) =>
      sourcePolicyApproved(sourceId, context.sourceMap, context.sourceRegistryMap)
    ),
    has_opposing_evidence:
      (claim.opposing_extraction_ids || []).length > 0 ||
      (claim.opposing_article_ids || []).length > 0 ||
      (claim.opposing_source_ids || []).length > 0,
    average_extraction_confidence: round2(averageExtractionConfidence),
    metadata_only: metadataOnly || evidenceLevels.some((level) => String(level || "").includes("metadata")),
    missing_input_count: (claim.missing_inputs || []).length
  };
}

function computeConfidence(factors) {
  let confidence = 0.15;
  confidence += Math.min(factors.supporting_source_count, 3) * 0.08;
  confidence += Math.min(factors.supporting_article_count, 3) * 0.06;
  confidence += Math.min(factors.supporting_extraction_count, 3) * 0.05;
  confidence += Math.min(factors.language_count, 3) * 0.03;
  confidence += Math.min(factors.source_type_count, 3) * 0.03;
  confidence += factors.has_approved_source_policy ? 0.08 : -0.05;
  confidence += factors.average_extraction_confidence * 0.2;
  confidence -= factors.metadata_only ? 0.08 : 0;
  confidence -= Math.min(factors.missing_input_count, 5) * 0.03;
  confidence -= factors.has_opposing_evidence ? 0.08 : 0;
  return Math.max(0, Math.min(1, round2(confidence)));
}

function validateExtractionDerivedRefs(claim, context, errors) {
  const supportingExtractions = (claim.supporting_extraction_ids || [])
    .map((id) => context.extractionMap.get(id))
    .filter(Boolean);
  const opposingExtractions = (claim.opposing_extraction_ids || [])
    .map((id) => context.extractionMap.get(id))
    .filter(Boolean);
  const derivedSupportingArticleIds = unique(supportingExtractions.flatMap(extractionArticleIds));
  const derivedSupportingSourceIds = unique(supportingExtractions.flatMap(extractionSourceIds));
  const derivedOpposingArticleIds = unique([
    ...opposingExtractions.flatMap(extractionArticleIds),
    ...supportingExtractions.flatMap(opposingArticleIds)
  ]);
  const derivedOpposingSourceIds = unique([
    ...opposingExtractions.flatMap(extractionSourceIds),
    ...supportingExtractions.flatMap(opposingSourceIds)
  ]);

  for (const id of derivedSupportingArticleIds) {
    if (!(claim.supporting_article_ids || []).includes(id)) {
      errors.push(`claim ${claim.id}: missing article ${id} from supporting_article_ids`);
    }
  }
  for (const id of claim.supporting_article_ids || []) {
    if (!derivedSupportingArticleIds.includes(id)) {
      errors.push(`claim ${claim.id}: supporting_article_ids includes non-extraction-derived article ${id}`);
    }
  }
  for (const id of derivedSupportingSourceIds) {
    if (!(claim.supporting_source_ids || []).includes(id)) {
      errors.push(`claim ${claim.id}: missing source ${id} from supporting_source_ids`);
    }
  }
  for (const id of claim.supporting_source_ids || []) {
    if (!derivedSupportingSourceIds.includes(id)) {
      errors.push(`claim ${claim.id}: supporting_source_ids includes non-extraction-derived source ${id}`);
    }
  }

  for (const id of claim.opposing_article_ids || []) {
    if (!derivedOpposingArticleIds.includes(id)) {
      errors.push(`claim ${claim.id}: opposing_article_ids includes non-extraction-derived article ${id}`);
    }
  }
  for (const id of claim.opposing_source_ids || []) {
    if (!derivedOpposingSourceIds.includes(id)) {
      errors.push(`claim ${claim.id}: opposing_source_ids includes non-extraction-derived source ${id}`);
    }
  }

  for (const extraction of [...supportingExtractions, ...opposingExtractions]) {
    if (extraction.match_id !== claim.match_id) {
      errors.push(`claim ${claim.id}: extraction ${extraction.id} belongs to different match ${extraction.match_id}`);
    }
    for (const teamId of claim.team_ids || []) {
      if ((extraction.team_ids || []).length > 0 && !(extraction.team_ids || []).includes(teamId)) {
        errors.push(`claim ${claim.id}: extraction ${extraction.id} does not include team ${teamId}`);
      }
    }
  }
}

function validateClaim(claim, context, errors) {
  requireFields("claim", claim, REQUIRED_FIELDS, errors);
  scanProhibitedFields("claim", claim, errors);

  for (const field of ARRAY_FIELDS) {
    checkArrayField("claim", claim, field, errors);
  }

  if (!context.matchIds.has(claim.match_id)) {
    errors.push(`claim ${claim.id}: match_id references missing match ${claim.match_id}`);
  }
  checkReferences("claim", claim.id, "team_ids", claim.team_ids, context.teamIds, errors);
  checkReferences("claim", claim.id, "supporting_extraction_ids", claim.supporting_extraction_ids, context.extractionIds, errors);
  checkReferences("claim", claim.id, "supporting_article_ids", claim.supporting_article_ids, context.articleIds, errors);
  checkReferences("claim", claim.id, "supporting_source_ids", claim.supporting_source_ids, context.sourceIds, errors);
  checkReferences("claim", claim.id, "opposing_extraction_ids", claim.opposing_extraction_ids, context.extractionIds, errors);
  checkReferences("claim", claim.id, "opposing_article_ids", claim.opposing_article_ids, context.articleIds, errors);
  checkReferences("claim", claim.id, "opposing_source_ids", claim.opposing_source_ids, context.sourceIds, errors);

  if ((claim.supporting_extraction_ids || []).length === 0) {
    errors.push(`claim ${claim.id}: supporting_extraction_ids must contain at least one extraction`);
  }
  if ((claim.supporting_article_ids || []).length === 0) {
    errors.push(`claim ${claim.id}: supporting_article_ids must contain at least one article`);
  }
  if ((claim.supporting_source_ids || []).length === 0) {
    errors.push(`claim ${claim.id}: supporting_source_ids must contain at least one source`);
  }
  if (!ALLOWED_CLAIM_TYPES.has(claim.claim_type)) {
    errors.push(`claim ${claim.id}: unsupported claim_type ${claim.claim_type}`);
  }
  if (!ALLOWED_PHASES.has(claim.tactical_phase)) {
    errors.push(`claim ${claim.id}: unsupported tactical_phase ${claim.tactical_phase}`);
  }
  if (!ALLOWED_DISAGREEMENT.has(claim.disagreement_status)) {
    errors.push(`claim ${claim.id}: unsupported disagreement_status ${claim.disagreement_status}`);
  }
  if (!ALLOWED_STATUS.has(claim.status)) {
    errors.push(`claim ${claim.id}: unsupported status ${claim.status}`);
  }
  if (typeof claim.confidence !== "number" || claim.confidence < 0 || claim.confidence > 1) {
    errors.push(`claim ${claim.id}: confidence must be a number from 0 to 1`);
  }
  if (typeof claim.claim_text_ja !== "string" || claim.claim_text_ja.length === 0) {
    errors.push(`claim ${claim.id}: claim_text_ja must be a non-empty string`);
  }
  if (typeof claim.claim_text_ja === "string" && claim.claim_text_ja.length > 180) {
    errors.push(`claim ${claim.id}: claim_text_ja should be concise and under 180 characters`);
  }
  if ((claim.opposing_extraction_ids || []).length > 0 && claim.disagreement_status === "none") {
    errors.push(`claim ${claim.id}: disagreement_status must not be none when opposing evidence exists`);
  }
  if ((claim.opposing_extraction_ids || []).length === 0 && claim.disagreement_status !== "none") {
    errors.push(`claim ${claim.id}: disagreement_status requires opposing_extraction_ids`);
  }

  validateExtractionDerivedRefs(claim, context, errors);

  const expectedDuplicateKey = deterministicClaimKey(claim);
  if (claim.duplicate_key !== expectedDuplicateKey) {
    errors.push(`claim ${claim.id}: duplicate_key must be ${expectedDuplicateKey}`);
  }

  const expectedFactors = computeConfidenceFactors(claim, context);
  const factorJson = JSON.stringify(claim.confidence_factors || {});
  const expectedFactorJson = JSON.stringify(expectedFactors);
  if (factorJson !== expectedFactorJson) {
    errors.push(`claim ${claim.id}: confidence_factors must equal deterministic factors ${expectedFactorJson}`);
  }

  const expectedConfidence = computeConfidence(expectedFactors);
  if (claim.confidence !== expectedConfidence) {
    errors.push(`claim ${claim.id}: confidence must be deterministic value ${expectedConfidence}`);
  }
}

function validateClaims(claims, context) {
  const errors = [];

  if (!Array.isArray(claims)) {
    return ["data/tactical_claims.json: root must be an array"];
  }

  for (const claim of claims) {
    if (!claim.id) {
      errors.push("claim: record missing id");
    }
  }

  for (const id of duplicateValues(claims, (claim) => claim.id)) {
    errors.push(`claim: duplicate id ${id}`);
  }

  for (const key of duplicateValues(claims, deterministicClaimKey)) {
    errors.push(`claim: duplicate deterministic claim key ${key}`);
  }

  for (const key of duplicateValues(claims, (claim) => claim.duplicate_key)) {
    errors.push(`claim: duplicate declared duplicate_key ${key}`);
  }

  for (const claim of claims) {
    validateClaim(claim, context, errors);
  }

  return errors.sort();
}

function buildContext(warnings, errors) {
  const extractions = ensureArrayRoot(
    "data/article_extractions.json",
    readJson("data/article_extractions.json", [], warnings),
    errors
  );
  const articles = ensureArrayRoot("data/articles.json", readJson("data/articles.json", [], warnings), errors);
  const matches = ensureArrayRoot("data/matches.json", readJson("data/matches.json", [], warnings), errors);
  const teams = ensureArrayRoot("data/teams.json", readJson("data/teams.json", [], warnings), errors);
  const sources = ensureArrayRoot("data/sources.json", readJson("data/sources.json", [], warnings), errors);
  const sourceRegistry = ensureArrayRoot(
    "data/source_registry.json",
    readJson("data/source_registry.json", [], warnings),
    errors
  );

  return {
    articleMap: byId(articles),
    extractionMap: byId(extractions),
    sourceMap: byId(sources),
    sourceRegistryMap: byId(sourceRegistry),
    articleIds: ids(articles),
    extractionIds: ids(extractions),
    matchIds: ids(matches),
    teamIds: ids(teams),
    sourceIds: new Set([...ids(sources), ...ids(sourceRegistry)]),
    articles,
    extractions
  };
}

function summarize(claims, errors, warnings, context) {
  const supportingArticleIds = unique(claims.flatMap((claim) => claim.supporting_article_ids || []));
  const supportingSourceIds = unique(claims.flatMap((claim) => claim.supporting_source_ids || []));
  const supportingExtractionIds = unique(claims.flatMap((claim) => claim.supporting_extraction_ids || []));
  const opposingExtractionIds = unique(claims.flatMap((claim) => claim.opposing_extraction_ids || []));
  const languages = unique([
    ...supportingArticleIds.map((id) => context.articleMap.get(id)?.language),
    ...supportingExtractionIds.map((id) => context.extractionMap.get(id)?.language)
  ]);
  const averageConfidence = claims.length
    ? claims.reduce((sum, claim) => sum + (typeof claim.confidence === "number" ? claim.confidence : 0), 0) / claims.length
    : 0;

  return {
    claim_count: claims.length,
    supporting_extraction_count: supportingExtractionIds.length,
    supporting_article_count: supportingArticleIds.length,
    supporting_source_count: supportingSourceIds.length,
    opposing_extraction_count: opposingExtractionIds.length,
    language_count: languages.length,
    duplicate_claim_ids: duplicateValues(claims, (claim) => claim.id),
    duplicate_claim_keys: duplicateValues(claims, deterministicClaimKey),
    validation_error_count: errors.length,
    validation_warning_count: warnings.length,
    errors,
    warnings,
    confidence_summary: {
      average: round2(averageConfidence),
      low_count: claims.filter((claim) => (claim.confidence ?? 0) < 0.4).length
    },
    normalized_claims: claims.map((claim) => ({
      id: claim.id,
      duplicate_key: deterministicClaimKey(claim),
      confidence: claim.confidence,
      computed_confidence: computeConfidence(computeConfidenceFactors(claim, context)),
      disagreement_status: claim.disagreement_status,
      status: claim.status
    })),
    notes: "Local-only tactical claim validation. No crawler, external API, paid API, secrets, article body, or image storage."
  };
}

function runNegativeSelfTest(context) {
  const baseClaims = ensureArrayRoot(
    "data/tactical_claims.json",
    readJson("data/tactical_claims.json", [], []),
    []
  );
  const cases = [
    {
      name: "duplicate claim ID",
      claims: [...baseClaims, { ...baseClaims[0] }]
    },
    {
      name: "missing extraction ref",
      claims: [{ ...baseClaims[0], supporting_extraction_ids: ["missing-extraction"] }]
    },
    {
      name: "missing source ref",
      claims: [{ ...baseClaims[0], supporting_source_ids: ["missing-source"] }]
    },
    {
      name: "ungrounded claim",
      claims: [{ ...baseClaims[0], supporting_extraction_ids: [], supporting_article_ids: [], supporting_source_ids: [] }]
    },
    {
      name: "confidence range",
      claims: [{ ...baseClaims[0], confidence: 1.5 }]
    },
    {
      name: "prohibited content field",
      claims: [{ ...baseClaims[0], full_text: "not allowed" }]
    }
  ];

  const results = cases.map((testCase) => {
    const errors = validateClaims(testCase.claims, context);
    return {
      name: testCase.name,
      passed: errors.length > 0,
      observed_error_count: errors.length
    };
  });

  const failures = results.filter((result) => !result.passed);
  process.stdout.write(`${JSON.stringify({ negative_self_test: results, failure_count: failures.length }, null, 2)}\n`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

function main() {
  const warnings = [];
  const contextErrors = [];
  const context = buildContext(warnings, contextErrors);

  if (process.argv.includes("--self-test-negative")) {
    runNegativeSelfTest(context);
    return;
  }

  const claims = ensureArrayRoot(
    "data/tactical_claims.json",
    readJson("data/tactical_claims.json", [], warnings),
    contextErrors
  );
  const errors = [...contextErrors, ...validateClaims(claims, context)].sort();

  process.stdout.write(`${JSON.stringify(summarize(claims, errors, warnings.sort(), context), null, 2)}\n`);
  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
