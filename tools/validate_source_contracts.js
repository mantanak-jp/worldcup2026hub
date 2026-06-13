const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const CANDIDATE_STATUSES = new Set([
  "discovered",
  "researching",
  "policy_review",
  "ready_for_decision",
  "approved_for_registry",
  "rejected",
  "on_hold",
  "superseded"
]);

const APPROVAL_STATUSES = new Set([
  "approved_metadata_only",
  "approved_metadata_and_short_notes",
  "approved_for_review_generation",
  "re_review_required",
  "suspended_policy",
  "retired"
]);

const ACTIVE_APPROVAL_STATUSES = new Set([
  "approved_metadata_only",
  "approved_metadata_and_short_notes",
  "approved_for_review_generation"
]);

const RUNTIME_STATUSES = new Set([
  "disabled",
  "enabled",
  "paused",
  "error_hold",
  "emergency_disabled",
  "retired"
]);

const SOURCE_CATEGORIES = new Set([
  "tactical_analysis",
  "match_report",
  "official",
  "statistics",
  "manager_comment",
  "player_comment",
  "preview",
  "longform_analysis",
  "video_analysis"
]);

const CRAWL_METHODS = new Set([
  "rss",
  "sitemap",
  "site_search",
  "search_api",
  "custom_fetcher",
  "disabled"
]);

const ACCESS_TYPES = new Set(["public", "paywalled", "api", "manual", "disabled"]);
const POLICY_STATUSES = new Set([
  "not_started",
  "manual-review-needed",
  "in_review",
  "reviewed",
  "approved",
  "blocked",
  "rejected"
]);
const ALLOWED_USE_VALUES = new Set([
  "metadata-and-link-only",
  "metadata-link-and-short-original-notes",
  "metadata-extraction-notes-and-generated-review",
  "blocked",
  "manual-review-needed"
]);
const CONTENT_STORAGE_POLICIES = new Set([
  "metadata-only",
  "metadata-and-short-original-notes",
  "metadata-extraction-notes-and-generated-review",
  "manual-review-needed",
  "blocked"
]);
const API_COST_POLICIES = new Set(["no-paid-api", "not-required", "manual-review-needed", "blocked"]);
const EVIDENCE_TYPES = new Set(["robots", "terms", "copyright", "access", "storage", "cost", "other"]);

const CANDIDATE_REQUIRED_FIELDS = [
  "id",
  "name",
  "base_url",
  "languages",
  "country_or_region",
  "source_category",
  "candidate_status",
  "discovery_methods",
  "discovered_at",
  "discovered_by",
  "research_notes",
  "robots_policy_status",
  "terms_policy_status",
  "copyright_review_status",
  "allowed_use_status",
  "content_storage_policy_status",
  "paid_access_status",
  "policy_evidence",
  "decision_notes",
  "created_at",
  "updated_at"
];

const REGISTRY_REQUIRED_FIELDS = [
  "id",
  "name",
  "base_url",
  "languages",
  "country_or_region",
  "source_category",
  "crawl_method",
  "discovery_methods",
  "access_type",
  "robots_policy_status",
  "terms_policy_status",
  "copyright_review_status",
  "allowed_use",
  "content_storage_policy",
  "full_text_storage_allowed",
  "external_image_storage_allowed",
  "paid_api_required",
  "api_cost_policy",
  "approval_status",
  "runtime_status",
  "enabled",
  "priority",
  "policy_evidence",
  "approved_at",
  "approved_by",
  "last_policy_reviewed_at",
  "next_policy_review_at",
  "runtime_status_reason",
  "created_at",
  "updated_at"
];

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
  "screenshot",
  "api_key",
  "api_token",
  "secret",
  "secrets",
  "password",
  "credentials",
  "billing_account"
]);

function readJson(relativePath, fallback = []) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoTimestamp(value) {
  return typeof value === "string" && value.length >= 10 && !Number.isNaN(Date.parse(value));
}

function scanProhibited(kind, record, errors, prefix = "", ownerId = record?.id) {
  if (!record || typeof record !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(record)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_CONTENT_FIELDS.has(key)) {
      errors.push(`${kind} ${ownerId || "(unknown)"}: prohibited content-like or secret field ${fieldPath}`);
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

function checkArray(kind, record, field, errors, options = {}) {
  const value = record[field];
  if (!Array.isArray(value)) {
    errors.push(`${kind} ${record.id}: ${field} must be an array`);
    return [];
  }
  if (options.nonEmpty && value.length === 0) {
    errors.push(`${kind} ${record.id}: ${field} must not be empty`);
  }
  if (options.allowedValues) {
    for (const item of value) {
      if (!options.allowedValues.has(item)) {
        errors.push(`${kind} ${record.id}: ${field} has invalid value ${item}`);
      }
    }
  }
  return value;
}

function checkTimestamp(kind, record, field, errors, options = {}) {
  if (!(field in record)) {
    return;
  }
  const value = record[field];
  if (value === null && options.allowNull) {
    return;
  }
  if (!isIsoTimestamp(value)) {
    errors.push(`${kind} ${record.id}: ${field} must be an ISO-8601 timestamp`);
  }
}

function checkPolicyEvidence(kind, record, errors, options = {}) {
  const evidence = record.policy_evidence;
  if (!Array.isArray(evidence)) {
    errors.push(`${kind} ${record.id}: policy_evidence must be an array`);
    return;
  }
  if (options.required && evidence.length === 0) {
    errors.push(`${kind} ${record.id}: policy_evidence is required for promotion or operation`);
  }

  const types = new Set();
  evidence.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(`${kind} ${record.id}: policy_evidence[${index}] must be an object`);
      return;
    }
    for (const field of ["evidence_type", "url", "checked_at", "checked_by", "note"]) {
      if (!(field in item)) {
        errors.push(`${kind} ${record.id}: policy_evidence[${index}] missing ${field}`);
      }
    }
    if (!EVIDENCE_TYPES.has(item.evidence_type)) {
      errors.push(`${kind} ${record.id}: policy_evidence[${index}] invalid evidence_type ${item.evidence_type}`);
    } else {
      types.add(item.evidence_type);
    }
    if (!isIsoTimestamp(item.checked_at)) {
      errors.push(`${kind} ${record.id}: policy_evidence[${index}].checked_at must be ISO-8601`);
    }
    if (typeof item.note === "string" && item.note.length > 320) {
      errors.push(`${kind} ${record.id}: policy_evidence[${index}].note is too long`);
    }
  });

  if (options.required) {
    for (const requiredType of ["robots", "terms", "copyright", "access"]) {
      if (!types.has(requiredType)) {
        errors.push(`${kind} ${record.id}: policy_evidence missing ${requiredType} evidence`);
      }
    }
  }
}

function isLegacyRegistryCandidate(record) {
  return !("approval_status" in record) && !("runtime_status" in record);
}

function validateCandidate(record, errors) {
  requireFields("candidate", record, CANDIDATE_REQUIRED_FIELDS, errors);
  scanProhibited("candidate", record, errors);

  if ("enabled" in record || "runtime_status" in record || "crawl_method" in record) {
    errors.push(`candidate ${record.id}: candidate records must not contain runtime enablement fields`);
  }
  if (!CANDIDATE_STATUSES.has(record.candidate_status)) {
    errors.push(`candidate ${record.id}: invalid candidate_status ${record.candidate_status}`);
  }
  checkArray("candidate", record, "languages", errors, { nonEmpty: true });
  checkArray("candidate", record, "source_category", errors, { nonEmpty: true, allowedValues: SOURCE_CATEGORIES });
  checkArray("candidate", record, "discovery_methods", errors, { nonEmpty: true });

  for (const field of [
    "robots_policy_status",
    "terms_policy_status",
    "copyright_review_status",
    "allowed_use_status",
    "content_storage_policy_status",
    "paid_access_status"
  ]) {
    if (!POLICY_STATUSES.has(record[field])) {
      errors.push(`candidate ${record.id}: invalid ${field} ${record[field]}`);
    }
  }

  for (const field of ["discovered_at", "created_at", "updated_at"]) {
    checkTimestamp("candidate", record, field, errors);
  }

  checkPolicyEvidence("candidate", record, errors, {
    required: record.candidate_status === "ready_for_decision" || record.candidate_status === "approved_for_registry"
  });
}

function validateLegacyRegistryCandidate(record, errors, warnings) {
  scanProhibited("legacy registry source", record, errors);
  if (record.enabled !== false) {
    errors.push(`legacy registry source ${record.id}: legacy candidate records must remain enabled=false`);
  }
  if (record.crawl_method !== "disabled") {
    errors.push(`legacy registry source ${record.id}: legacy candidate records must keep crawl_method=disabled`);
  }
  if (record.paid_api_required !== false) {
    errors.push(`legacy registry source ${record.id}: paid_api_required must be false`);
  }
  if (record.full_text_storage_allowed !== false) {
    errors.push(`legacy registry source ${record.id}: full_text_storage_allowed must be false`);
  }
  if ("external_image_storage_allowed" in record && record.external_image_storage_allowed !== false) {
    errors.push(`legacy registry source ${record.id}: external_image_storage_allowed must be false`);
  }
  if (record.allowed_use !== "manual-review-needed" && record.allowed_use !== "blocked") {
    errors.push(`legacy registry source ${record.id}: legacy candidates must not carry approved allowed_use`);
  }
  warnings.push(`legacy registry source ${record.id}: pending migration to data/source_candidates.json`);
}

function validateRegistry(record, errors, warnings) {
  if (isLegacyRegistryCandidate(record)) {
    validateLegacyRegistryCandidate(record, errors, warnings);
    return;
  }

  requireFields("registry source", record, REGISTRY_REQUIRED_FIELDS, errors);
  scanProhibited("registry source", record, errors);

  checkArray("registry source", record, "languages", errors, { nonEmpty: true });
  checkArray("registry source", record, "source_category", errors, { nonEmpty: true, allowedValues: SOURCE_CATEGORIES });
  checkArray("registry source", record, "discovery_methods", errors, { nonEmpty: true });

  if (!CRAWL_METHODS.has(record.crawl_method)) {
    errors.push(`registry source ${record.id}: invalid crawl_method ${record.crawl_method}`);
  }
  if (!ACCESS_TYPES.has(record.access_type)) {
    errors.push(`registry source ${record.id}: invalid access_type ${record.access_type}`);
  }
  if (!APPROVAL_STATUSES.has(record.approval_status)) {
    errors.push(`registry source ${record.id}: invalid approval_status ${record.approval_status}`);
  }
  if (!RUNTIME_STATUSES.has(record.runtime_status)) {
    errors.push(`registry source ${record.id}: invalid runtime_status ${record.runtime_status}`);
  }
  if (record.enabled !== (record.runtime_status === "enabled")) {
    errors.push(`registry source ${record.id}: enabled must equal runtime_status == enabled`);
  }

  for (const field of ["robots_policy_status", "terms_policy_status", "copyright_review_status"]) {
    if (!POLICY_STATUSES.has(record[field])) {
      errors.push(`registry source ${record.id}: invalid ${field} ${record[field]}`);
    }
  }
  if (!ALLOWED_USE_VALUES.has(record.allowed_use)) {
    errors.push(`registry source ${record.id}: invalid allowed_use ${record.allowed_use}`);
  }
  if (!CONTENT_STORAGE_POLICIES.has(record.content_storage_policy)) {
    errors.push(`registry source ${record.id}: invalid content_storage_policy ${record.content_storage_policy}`);
  }
  if (!API_COST_POLICIES.has(record.api_cost_policy)) {
    errors.push(`registry source ${record.id}: invalid api_cost_policy ${record.api_cost_policy}`);
  }

  if (record.full_text_storage_allowed !== false) {
    errors.push(`registry source ${record.id}: full_text_storage_allowed must default to false`);
  }
  if (record.external_image_storage_allowed !== false) {
    errors.push(`registry source ${record.id}: external_image_storage_allowed must default to false`);
  }
  if (record.paid_api_required !== false) {
    errors.push(`registry source ${record.id}: paid_api_required must be false`);
  }
  if (record.access_type === "api" || record.crawl_method === "search_api") {
    errors.push(`registry source ${record.id}: external API access is not allowed in the current implementation path`);
  }

  if (record.enabled) {
    if (!ACTIVE_APPROVAL_STATUSES.has(record.approval_status)) {
      errors.push(`registry source ${record.id}: enabled source requires active approval_status`);
    }
    if (record.approval_status === "re_review_required" || record.approval_status === "suspended_policy" || record.approval_status === "retired") {
      errors.push(`registry source ${record.id}: ${record.approval_status} source must not be enabled`);
    }
    if (record.runtime_status === "retired" || record.runtime_status === "paused" || record.runtime_status === "error_hold" || record.runtime_status === "emergency_disabled") {
      errors.push(`registry source ${record.id}: ${record.runtime_status} source must not be enabled`);
    }
    if (record.crawl_method === "disabled") {
      errors.push(`registry source ${record.id}: enabled source requires approved crawl_method`);
    }
    if (record.allowed_use === "manual-review-needed" || record.allowed_use === "blocked") {
      errors.push(`registry source ${record.id}: enabled source requires approved allowed_use`);
    }
  }

  for (const field of ["approved_at", "last_policy_reviewed_at", "next_policy_review_at", "created_at", "updated_at"]) {
    checkTimestamp("registry source", record, field, errors, { allowNull: field === "next_policy_review_at" });
  }

  checkPolicyEvidence("registry source", record, errors, { required: true });
}

function validateSourceContracts(candidates, registry) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(candidates)) {
    errors.push("data/source_candidates.json: root must be an array");
    candidates = [];
  }
  if (!Array.isArray(registry)) {
    errors.push("data/source_registry.json: root must be an array");
    registry = [];
  }

  for (const id of duplicateValues(candidates.map((source) => source.id))) {
    errors.push(`candidate: duplicate id ${id}`);
  }
  for (const id of duplicateValues(registry.map((source) => source.id))) {
    errors.push(`registry source: duplicate id ${id}`);
  }

  const candidateIds = new Set(candidates.map((source) => source.id));
  for (const source of registry) {
    if (candidateIds.has(source.id)) {
      errors.push(`source id ${source.id}: must not exist in both candidates and registry`);
    }
  }

  for (const candidate of candidates) {
    if (!isPlainObject(candidate)) {
      errors.push("candidate: each record must be an object");
      continue;
    }
    validateCandidate(candidate, errors);
  }

  for (const source of registry) {
    if (!isPlainObject(source)) {
      errors.push("registry source: each record must be an object");
      continue;
    }
    validateRegistry(source, errors, warnings);
  }

  const legacyRegistryCount = registry.filter(isLegacyRegistryCandidate).length;
  const operationalRegistryCount = registry.length - legacyRegistryCount;
  const enabledOperationalCount = registry.filter((source) => source.runtime_status === "enabled" && source.enabled === true).length;

  return {
    ok: errors.length === 0,
    candidate_count: candidates.length,
    registry_count: registry.length,
    legacy_registry_count: legacyRegistryCount,
    operational_registry_count: operationalRegistryCount,
    enabled_operational_count: enabledOperationalCount,
    validation_error_count: errors.length,
    validation_warning_count: warnings.length,
    errors: errors.sort(),
    warnings: warnings.sort(),
    notes: "Local-only source contract validation. Candidates are not crawler inputs and do not count as approved source coverage."
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeCandidate(overrides = {}) {
  return {
    id: "candidate-safe-fixture",
    name: "Safe candidate fixture",
    base_url: "https://example.com/safe-candidate",
    languages: ["en"],
    country_or_region: "fixture",
    source_category: ["match_report"],
    candidate_status: "policy_review",
    discovery_methods: ["manual_candidate"],
    discovered_at: "2026-06-13T00:00:00Z",
    discovered_by: "validator_self_test",
    research_notes: "Short original fixture note.",
    robots_policy_status: "manual-review-needed",
    terms_policy_status: "manual-review-needed",
    copyright_review_status: "manual-review-needed",
    allowed_use_status: "manual-review-needed",
    content_storage_policy_status: "manual-review-needed",
    paid_access_status: "manual-review-needed",
    policy_evidence: [],
    decision_notes: "",
    created_at: "2026-06-13T00:00:00Z",
    updated_at: "2026-06-13T00:00:00Z",
    ...overrides
  };
}

function safeRegistry(overrides = {}) {
  return {
    id: "source-safe-fixture",
    name: "Safe operational fixture",
    base_url: "https://example.com/safe-source",
    languages: ["en"],
    country_or_region: "fixture",
    source_category: ["match_report"],
    crawl_method: "rss",
    discovery_methods: ["rss"],
    access_type: "public",
    robots_policy_status: "approved",
    terms_policy_status: "approved",
    copyright_review_status: "approved",
    allowed_use: "metadata-extraction-notes-and-generated-review",
    content_storage_policy: "metadata-extraction-notes-and-generated-review",
    full_text_storage_allowed: false,
    external_image_storage_allowed: false,
    paid_api_required: false,
    api_cost_policy: "no-paid-api",
    approval_status: "approved_for_review_generation",
    runtime_status: "disabled",
    enabled: false,
    priority: 1,
    policy_evidence: [
      { evidence_type: "robots", url: "https://example.com/robots.txt", checked_at: "2026-06-13T00:00:00Z", checked_by: "validator_self_test", note: "Fixture robots review." },
      { evidence_type: "terms", url: "https://example.com/terms", checked_at: "2026-06-13T00:00:00Z", checked_by: "validator_self_test", note: "Fixture terms review." },
      { evidence_type: "copyright", url: "https://example.com/policy", checked_at: "2026-06-13T00:00:00Z", checked_by: "validator_self_test", note: "Fixture copyright review." },
      { evidence_type: "access", url: "https://example.com/feed", checked_at: "2026-06-13T00:00:00Z", checked_by: "validator_self_test", note: "Fixture access review." }
    ],
    approved_at: "2026-06-13T00:00:00Z",
    approved_by: "validator_self_test",
    last_policy_reviewed_at: "2026-06-13T00:00:00Z",
    next_policy_review_at: "2026-12-13T00:00:00Z",
    runtime_status_reason: "Fixture remains disabled until explicit enablement.",
    created_at: "2026-06-13T00:00:00Z",
    updated_at: "2026-06-13T00:00:00Z",
    ...overrides
  };
}

function expectNegative(name, candidates, registry, expectedPattern) {
  const result = validateSourceContracts(clone(candidates), clone(registry));
  const matched = result.errors.some((error) => error.includes(expectedPattern));
  return {
    name,
    passed: !result.ok && matched,
    observed_error_count: result.errors.length
  };
}

function runNegativeSelfTest() {
  const baseCandidate = safeCandidate();
  const baseRegistry = safeRegistry();
  const enabledRegistry = safeRegistry({ runtime_status: "enabled", enabled: true });
  const cases = [
    expectNegative("candidate enabled=true", [{ ...baseCandidate, enabled: true }], [], "runtime enablement"),
    expectNegative("duplicate source ID", [], [baseRegistry, { ...baseRegistry }], "duplicate id"),
    expectNegative("candidate and registry same ID", [safeCandidate({ id: "same-source" })], [safeRegistry({ id: "same-source" })], "must not exist in both"),
    expectNegative("invalid candidate status", [safeCandidate({ candidate_status: "approved" })], [], "invalid candidate_status"),
    expectNegative("invalid approval status", [], [safeRegistry({ approval_status: "approved" })], "invalid approval_status"),
    expectNegative("invalid runtime status", [], [safeRegistry({ runtime_status: "running" })], "invalid runtime_status"),
    expectNegative("enabled but approval missing", [], [safeRegistry({ approval_status: "re_review_required", runtime_status: "enabled", enabled: true })], "requires active approval_status"),
    expectNegative("enabled but crawl method missing", [], [safeRegistry({ runtime_status: "enabled", enabled: true, crawl_method: "disabled" })], "requires approved crawl_method"),
    expectNegative("retired source enabled", [], [safeRegistry({ approval_status: "retired", runtime_status: "enabled", enabled: true })], "retired source must not be enabled"),
    expectNegative("suspended source enabled", [], [safeRegistry({ approval_status: "suspended_policy", runtime_status: "enabled", enabled: true })], "suspended_policy source must not be enabled"),
    expectNegative("policy evidence missing", [], [safeRegistry({ policy_evidence: [] })], "policy_evidence is required"),
    expectNegative("unauthorized full-text storage", [], [safeRegistry({ full_text_storage_allowed: true })], "full_text_storage_allowed must default to false"),
    expectNegative("unauthorized external-image storage", [], [safeRegistry({ external_image_storage_allowed: true })], "external_image_storage_allowed must default to false"),
    expectNegative("paid API requirement", [], [safeRegistry({ paid_api_required: true })], "paid_api_required must be false"),
    expectNegative("enabled source with paid API", [], [enabledRegistry, safeRegistry({ id: "paid-enabled", runtime_status: "enabled", enabled: true, paid_api_required: true })], "paid_api_required must be false")
  ];
  const failures = cases.filter((item) => !item.passed);
  return {
    ok: failures.length === 0,
    negative_case_count: cases.length,
    failed_case_count: failures.length,
    cases
  };
}

function main() {
  if (process.argv.includes("--self-test-negative")) {
    const result = runNegativeSelfTest();
    process.stdout.write(stableStringify(result));
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const candidates = readJson("data/source_candidates.json", []);
  const registry = readJson("data/source_registry.json", []);
  const result = validateSourceContracts(candidates, registry);
  process.stdout.write(stableStringify(result));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();
