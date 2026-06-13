const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const ARTICLE_REQUIRED_FIELDS = [
  "id",
  "source_id",
  "url",
  "canonical_url",
  "title",
  "language",
  "source_category",
  "article_type",
  "related_match_ids",
  "related_team_ids",
  "discovered_at",
  "checked_at",
  "updated_at",
  "extraction_status",
  "content_storage_policy",
  "full_text_stored",
  "duplicate_key",
  "notes"
];

const EXTRACTION_REQUIRED_FIELDS = [
  "id",
  "article_id",
  "source_id",
  "match_id",
  "team_ids",
  "language",
  "article_type",
  "extraction_method",
  "extraction_status",
  "extracted_topics",
  "tactical_phases",
  "tactical_themes",
  "short_notes_ja",
  "linked_claim_ids",
  "supporting_source_ids",
  "supporting_article_ids",
  "opposing_source_ids",
  "opposing_article_ids",
  "confidence",
  "uncertainty",
  "disagreement_notes_ja",
  "missing_inputs",
  "evidence_metadata",
  "created_at",
  "updated_at",
  "notes"
];

const ALLOWED_ARTICLE_TYPES = new Set([
  "official",
  "statistics",
  "tactical_analysis",
  "match_report",
  "manager_comment",
  "player_comment",
  "preview",
  "longform_analysis",
  "video_analysis"
]);

const ALLOWED_LANGUAGES = new Set(["ja", "en", "es", "fr", "de", "pt", "it", "multi", "unknown"]);
const ALLOWED_CONTENT_STORAGE_POLICIES = new Set(["metadata-only", "manual-review-needed"]);
const ALLOWED_EXTRACTION_STATUSES = new Set([
  "sample_metadata_only",
  "sample_unapproved_source",
  "extraction_pending",
  "extracted",
  "blocked",
  "failed"
]);
const ALLOWED_TACTICAL_PHASES = new Set([
  "in_possession",
  "out_of_possession",
  "transition_attack",
  "transition_defense",
  "set_piece",
  "substitution",
  "game_state",
  "unknown"
]);
const PROHIBITED_CONTENT_FIELDS = new Set([
  "body",
  "content",
  "html",
  "raw_html",
  "full_text",
  "article_body",
  "translated_body",
  "translation",
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

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function ids(items) {
  return new Set((items || []).map((item) => item.id).filter(Boolean));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number");
  if (valid.length === 0) {
    return 0;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function ensureArrayRoot(name, value, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${name}: root must be an array`);
    return [];
  }
  return value;
}

function requireFields(kind, record, fields, errors) {
  for (const field of fields) {
    if (!(field in record)) {
      errors.push(`${kind} ${record.id || "(missing id)"}: missing required field ${field}`);
    }
  }
}

function findDuplicateIds(kind, items, errors) {
  const duplicates = duplicateIds(items);

  for (const item of items) {
    if (!item.id) {
      errors.push(`${kind}: record missing id`);
    }
  }

  for (const id of duplicates) {
    errors.push(`${kind}: duplicate id ${id}`);
  }
}

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of items) {
    if (!item.id) {
      continue;
    }
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }

  return [...duplicates].sort();
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

function scanProhibitedFields(kind, record, errors, prefix = "") {
  if (!record || typeof record !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    const pathName = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_CONTENT_FIELDS.has(key)) {
      errors.push(`${kind} ${record.id || "(unknown)"}: prohibited content-like field ${pathName}`);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      scanProhibitedFields(kind, value, errors, pathName);
    }
  }
}

function validateArticle(article, context, errors) {
  requireFields("article", article, ARTICLE_REQUIRED_FIELDS, errors);
  scanProhibitedFields("article", article, errors);

  checkArrayField("article", article, "source_category", errors);
  checkArrayField("article", article, "related_match_ids", errors);
  checkArrayField("article", article, "related_team_ids", errors);

  if (article.full_text_stored !== false) {
    errors.push(`article ${article.id}: full_text_stored must be false`);
  }
  if (!context.sourceIds.has(article.source_id)) {
    errors.push(`article ${article.id}: source_id references missing source ${article.source_id}`);
  }
  if (!ALLOWED_LANGUAGES.has(article.language)) {
    errors.push(`article ${article.id}: unsupported language ${article.language}`);
  }
  if (!ALLOWED_ARTICLE_TYPES.has(article.article_type)) {
    errors.push(`article ${article.id}: unsupported article_type ${article.article_type}`);
  }
  if (!ALLOWED_CONTENT_STORAGE_POLICIES.has(article.content_storage_policy)) {
    errors.push(`article ${article.id}: unsupported content_storage_policy ${article.content_storage_policy}`);
  }

  checkReferences("article", article.id, "related_match_ids", article.related_match_ids, context.matchIds, errors);
  checkReferences("article", article.id, "related_team_ids", article.related_team_ids, context.teamIds, errors);
}

function validateExtraction(extraction, context, errors) {
  requireFields("extraction", extraction, EXTRACTION_REQUIRED_FIELDS, errors);
  scanProhibitedFields("extraction", extraction, errors);

  const article = context.articleMap.get(extraction.article_id);

  checkArrayField("extraction", extraction, "team_ids", errors);
  checkArrayField("extraction", extraction, "extracted_topics", errors);
  checkArrayField("extraction", extraction, "tactical_phases", errors);
  checkArrayField("extraction", extraction, "tactical_themes", errors);
  checkArrayField("extraction", extraction, "linked_claim_ids", errors);
  checkArrayField("extraction", extraction, "supporting_source_ids", errors);
  checkArrayField("extraction", extraction, "supporting_article_ids", errors);
  checkArrayField("extraction", extraction, "opposing_source_ids", errors);
  checkArrayField("extraction", extraction, "opposing_article_ids", errors);
  checkArrayField("extraction", extraction, "missing_inputs", errors);

  if (!article) {
    errors.push(`extraction ${extraction.id}: article_id references missing article ${extraction.article_id}`);
  } else {
    if (extraction.source_id !== article.source_id) {
      errors.push(`extraction ${extraction.id}: source_id must match article source_id ${article.source_id}`);
    }
    if (extraction.language !== article.language) {
      errors.push(`extraction ${extraction.id}: language must match article language ${article.language}`);
    }
    if (extraction.article_type !== article.article_type) {
      errors.push(`extraction ${extraction.id}: article_type must match article article_type ${article.article_type}`);
    }
  }

  if (!context.sourceIds.has(extraction.source_id)) {
    errors.push(`extraction ${extraction.id}: source_id references missing source ${extraction.source_id}`);
  }
  if (!context.matchIds.has(extraction.match_id)) {
    errors.push(`extraction ${extraction.id}: match_id references missing match ${extraction.match_id}`);
  }
  if (!ALLOWED_LANGUAGES.has(extraction.language)) {
    errors.push(`extraction ${extraction.id}: unsupported language ${extraction.language}`);
  }
  if (!ALLOWED_ARTICLE_TYPES.has(extraction.article_type)) {
    errors.push(`extraction ${extraction.id}: unsupported article_type ${extraction.article_type}`);
  }
  if (!ALLOWED_EXTRACTION_STATUSES.has(extraction.extraction_status)) {
    errors.push(`extraction ${extraction.id}: unsupported extraction_status ${extraction.extraction_status}`);
  }
  if (typeof extraction.confidence !== "number" || extraction.confidence < 0 || extraction.confidence > 1) {
    errors.push(`extraction ${extraction.id}: confidence must be a number from 0 to 1`);
  }
  if (typeof extraction.short_notes_ja !== "string" || extraction.short_notes_ja.length === 0) {
    errors.push(`extraction ${extraction.id}: short_notes_ja must be a non-empty string`);
  }
  if (typeof extraction.short_notes_ja === "string" && extraction.short_notes_ja.length > 180) {
    errors.push(`extraction ${extraction.id}: short_notes_ja should stay concise and under 180 characters`);
  }

  for (const phase of extraction.tactical_phases || []) {
    if (!ALLOWED_TACTICAL_PHASES.has(phase)) {
      errors.push(`extraction ${extraction.id}: unsupported tactical phase ${phase}`);
    }
  }

  checkReferences("extraction", extraction.id, "team_ids", extraction.team_ids, context.teamIds, errors);
  checkReferences("extraction", extraction.id, "linked_claim_ids", extraction.linked_claim_ids, context.claimIds, errors);
  checkReferences("extraction", extraction.id, "supporting_source_ids", extraction.supporting_source_ids, context.sourceIds, errors);
  checkReferences("extraction", extraction.id, "supporting_article_ids", extraction.supporting_article_ids, context.articleIds, errors);
  checkReferences("extraction", extraction.id, "opposing_source_ids", extraction.opposing_source_ids, context.sourceIds, errors);
  checkReferences("extraction", extraction.id, "opposing_article_ids", extraction.opposing_article_ids, context.articleIds, errors);
}

function main() {
  const warnings = [];
  const errors = [];

  const articles = ensureArrayRoot("data/articles.json", readJson("data/articles.json", [], warnings), errors);
  const extractions = ensureArrayRoot("data/article_extractions.json", readJson("data/article_extractions.json", [], warnings), errors);
  const claims = ensureArrayRoot("data/tactical_claims.json", readJson("data/tactical_claims.json", [], warnings), errors);
  const matches = ensureArrayRoot("data/matches.json", readJson("data/matches.json", [], warnings), errors);
  const teams = ensureArrayRoot("data/teams.json", readJson("data/teams.json", [], warnings), errors);
  const sources = ensureArrayRoot("data/sources.json", readJson("data/sources.json", [], warnings), errors);
  const sourceRegistry = ensureArrayRoot("data/source_registry.json", readJson("data/source_registry.json", [], warnings), errors);

  findDuplicateIds("article", articles, errors);
  findDuplicateIds("extraction", extractions, errors);

  const context = {
    articleMap: byId(articles),
    articleIds: ids(articles),
    claimIds: ids(claims),
    matchIds: ids(matches),
    teamIds: ids(teams),
    sourceIds: new Set([...ids(sources), ...ids(sourceRegistry)])
  };

  for (const article of articles) {
    validateArticle(article, context, errors);
  }

  for (const extraction of extractions) {
    validateExtraction(extraction, context, errors);
  }

  const linkedMatchIds = unique(extractions.map((extraction) => extraction.match_id));
  const linkedClaimIds = unique(extractions.flatMap((extraction) => extraction.linked_claim_ids || []));
  const confidenceAverage = average(extractions.map((extraction) => extraction.confidence));
  const articleSourceIds = unique(articles.map((article) => article.source_id));
  const extractionArticleIds = unique(extractions.map((extraction) => extraction.article_id));

  const summary = {
    article_count: articles.length,
    extraction_count: extractions.length,
    article_source_count: articleSourceIds.length,
    linked_article_count: extractionArticleIds.length,
    linked_match_count: linkedMatchIds.length,
    linked_claim_count: linkedClaimIds.length,
    duplicate_article_ids: duplicateIds(articles),
    duplicate_extraction_ids: duplicateIds(extractions),
    validation_error_count: errors.length,
    validation_warning_count: warnings.length,
    errors: errors.sort(),
    warnings: warnings.sort(),
    confidence_summary: {
      average: Number(confidenceAverage.toFixed(2)),
      low_count: extractions.filter((extraction) => (extraction.confidence ?? 0) < 0.4).length
    },
    notes: "Local-only validation summary. No network, external API, paid API, secrets, article body, crawler execution, or image storage."
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
