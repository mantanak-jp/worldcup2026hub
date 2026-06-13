const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const SECTION_ORDER = [
  "match_flow",
  "initial_shapes",
  "in_possession",
  "out_of_possession",
  "transitions",
  "adjustments",
  "substitutions",
  "turning_points",
  "key_players",
  "source_consensus",
  "source_disagreement",
  "limitations"
];

const OUTLINE_REQUIRED_FIELDS = [
  "id",
  "match_id",
  "claim_ids",
  "section_order",
  "match_flow_claim_ids",
  "initial_shape_claim_ids",
  "in_possession_claim_ids",
  "out_of_possession_claim_ids",
  "transition_claim_ids",
  "adjustment_claim_ids",
  "substitution_claim_ids",
  "turning_point_claim_ids",
  "key_player_claim_ids",
  "consensus_claim_ids",
  "disagreement_claim_ids",
  "missing_inputs",
  "source_coverage",
  "confidence",
  "confidence_factors",
  "uncertainty",
  "status",
  "generation_version",
  "generation_stability_key",
  "created_at",
  "updated_at"
];

const REVIEW_REQUIRED_FIELDS = [
  "id",
  "match_id",
  "outline_id",
  "title_ja",
  "short_summary_ja",
  "sections",
  "source_coverage",
  "confidence",
  "status",
  "missing_inputs",
  "uncertainty",
  "disagreement_summary_ja",
  "source_ids",
  "article_ids",
  "claim_ids",
  "generation_version",
  "generation_stability_key",
  "generated_at",
  "updated_at"
];

const SECTION_FIELD_NAMES = [
  "match_flow_claim_ids",
  "initial_shape_claim_ids",
  "in_possession_claim_ids",
  "out_of_possession_claim_ids",
  "transition_claim_ids",
  "adjustment_claim_ids",
  "substitution_claim_ids",
  "turning_point_claim_ids",
  "key_player_claim_ids",
  "consensus_claim_ids",
  "disagreement_claim_ids"
];

const PRIMARY_SECTION_FIELD_NAMES = [
  "match_flow_claim_ids",
  "initial_shape_claim_ids",
  "in_possession_claim_ids",
  "out_of_possession_claim_ids",
  "transition_claim_ids",
  "adjustment_claim_ids",
  "substitution_claim_ids",
  "turning_point_claim_ids",
  "key_player_claim_ids"
];

const ALLOWED_STATUSES = new Set([
  "auto_draft",
  "auto_published",
  "low_confidence",
  "insufficient_sources",
  "blocked",
  "failed"
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

const GENERATION_VERSION = "level3-outline-review-v1";
const FIXED_GENERATED_AT = "2026-06-13T00:00:00Z";

function readJson(relativePath, fallback = []) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function stableById(items) {
  return [...(items || [])].sort((a, b) => {
    const left = a.generation_stability_key || a.id || "";
    const right = b.generation_stability_key || b.id || "";
    return left.localeCompare(right);
  });
}

function round2(value) {
  return Number(value.toFixed(2));
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number");
  if (valid.length === 0) {
    return 0;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
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
  const articleType = (articleIds || [])
    .map((articleId) => articleMap.get(articleId))
    .find((article) => article?.source_id === sourceId)?.article_type;
  return source?.source_type || registry?.source_category?.[0] || articleType || "unknown";
}

function buildContext() {
  const matches = readJson("data/matches.json");
  const teams = readJson("data/teams.json");
  const claims = readJson("data/tactical_claims.json");
  const articles = readJson("data/articles.json");
  const extractions = readJson("data/article_extractions.json");
  const sources = readJson("data/sources.json");
  const sourceRegistry = readJson("data/source_registry.json");
  const outlines = readJson("data/review_outlines.json");
  const generatedReviews = readJson("data/generated_match_reviews.json");

  return {
    matches,
    teams,
    claims,
    articles,
    extractions,
    sources,
    sourceRegistry,
    outlines,
    generatedReviews,
    matchMap: byId(matches),
    teamMap: byId(teams),
    claimMap: byId(claims),
    articleMap: byId(articles),
    extractionMap: byId(extractions),
    sourceMap: byId(sources),
    sourceRegistryMap: byId(sourceRegistry),
    matchIds: ids(matches),
    claimIds: ids(claims)
  };
}

function allowedClaim(claim) {
  return claim && claim.status !== "blocked" && claim.status !== "failed";
}

function dedupeClaims(claims) {
  const seen = new Set();
  const deduped = [];
  for (const claim of stableById(claims).filter(allowedClaim)) {
    const key = claim.duplicate_key || claim.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(claim);
  }
  return deduped;
}

function isDisagreementClaim(claim) {
  return claim.claim_type === "source_disagreement" || claim.disagreement_status !== "none";
}

function sectionForClaim(claim) {
  if (isDisagreementClaim(claim)) {
    return "disagreement_claim_ids";
  }
  if (claim.claim_type === "match_flow") {
    return "match_flow_claim_ids";
  }
  if (claim.claim_type === "initial_shape") {
    return "initial_shape_claim_ids";
  }
  if (claim.claim_type === "adjustment") {
    return "adjustment_claim_ids";
  }
  if (claim.claim_type === "substitution_impact" || claim.tactical_phase === "substitution") {
    return "substitution_claim_ids";
  }
  if (claim.claim_type === "turning_point" || claim.tactical_phase === "game_state") {
    return "turning_point_claim_ids";
  }
  if (claim.claim_type === "key_player_role") {
    return "key_player_claim_ids";
  }
  if (claim.tactical_phase === "in_possession") {
    return "in_possession_claim_ids";
  }
  if (claim.tactical_phase === "out_of_possession") {
    return "out_of_possession_claim_ids";
  }
  if (claim.tactical_phase === "transition_attack" || claim.tactical_phase === "transition_defense") {
    return "transition_claim_ids";
  }
  return "match_flow_claim_ids";
}

function refsForClaims(claims) {
  const sourceIds = unique(claims.flatMap((claim) => [
    ...(claim.supporting_source_ids || []),
    ...(claim.opposing_source_ids || [])
  ]));
  const articleIds = unique(claims.flatMap((claim) => [
    ...(claim.supporting_article_ids || []),
    ...(claim.opposing_article_ids || [])
  ]));
  const extractionIds = unique(claims.flatMap((claim) => [
    ...(claim.supporting_extraction_ids || []),
    ...(claim.opposing_extraction_ids || [])
  ]));
  return { sourceIds, articleIds, extractionIds };
}

function coverageForClaims(claims, context) {
  const { sourceIds, articleIds, extractionIds } = refsForClaims(claims);
  const languages = unique([
    ...articleIds.map((id) => context.articleMap.get(id)?.language),
    ...extractionIds.map((id) => context.extractionMap.get(id)?.language)
  ]);
  const sourceTypes = unique(
    sourceIds.map((sourceId) =>
      sourceTypeFor(sourceId, context.sourceMap, context.sourceRegistryMap, context.articleMap, articleIds)
    )
  );
  const approvedSourceCount = sourceIds.filter((sourceId) =>
    sourcePolicyApproved(sourceId, context.sourceMap, context.sourceRegistryMap)
  ).length;
  const metadataOnlyEvidence = extractionIds.some(
    (id) => context.extractionMap.get(id)?.evidence_metadata?.has_event_data === false
  );
  const coverageLevel =
    sourceIds.length >= 2 && articleIds.length >= 2 && extractionIds.length >= 2 && approvedSourceCount > 0
      ? "partial"
      : "insufficient_sources";

  return {
    source_count: sourceIds.length,
    article_count: articleIds.length,
    extraction_count: extractionIds.length,
    languages,
    source_types: sourceTypes,
    approved_source_policy_count: approvedSourceCount,
    metadata_only_evidence: metadataOnlyEvidence,
    coverage_level: coverageLevel
  };
}

function missingInputsForClaims(claims) {
  return unique(claims.flatMap((claim) => claim.missing_inputs || []));
}

function uncertaintyForClaims(claims) {
  return unique(claims.map((claim) => claim.uncertainty));
}

function confidenceFactorsForClaims(claims, context, totalMatchClaimCount = claims.length) {
  const coverage = coverageForClaims(claims, context);
  const averageClaimConfidence = round2(average(claims.map((claim) => claim.confidence)));
  const disagreementCount = claims.filter(isDisagreementClaim).length;
  const lowConfidenceCount = claims.filter((claim) => (claim.confidence ?? 0) < 0.4).length;
  const blockedOrExcludedClaimCount = Math.max(0, totalMatchClaimCount - claims.length);
  const missingInputCount = missingInputsForClaims(claims).length;

  return {
    included_claim_count: claims.length,
    average_claim_confidence: averageClaimConfidence,
    source_count: coverage.source_count,
    article_count: coverage.article_count,
    extraction_count: coverage.extraction_count,
    language_count: coverage.languages.length,
    source_type_count: coverage.source_types.length,
    approved_source_policy_count: coverage.approved_source_policy_count,
    disagreement_count: disagreementCount,
    missing_input_count: missingInputCount,
    low_confidence_claim_count: lowConfidenceCount,
    blocked_or_excluded_claim_count: blockedOrExcludedClaimCount
  };
}

function confidenceForFactors(factors) {
  if (factors.included_claim_count === 0) {
    return 0;
  }

  let confidence = 0.12;
  confidence += factors.average_claim_confidence * 0.35;
  confidence += Math.min(factors.included_claim_count, 4) * 0.04;
  confidence += Math.min(factors.source_count, 4) * 0.04;
  confidence += Math.min(factors.article_count, 4) * 0.03;
  confidence += Math.min(factors.extraction_count, 4) * 0.03;
  confidence += Math.min(factors.language_count, 3) * 0.03;
  confidence += Math.min(factors.source_type_count, 3) * 0.03;
  confidence += factors.approved_source_policy_count > 0 ? 0.06 : -0.06;
  confidence -= Math.min(factors.disagreement_count, 3) * 0.04;
  confidence -= Math.min(factors.missing_input_count, 6) * 0.02;
  confidence -= factors.included_claim_count
    ? (factors.low_confidence_claim_count / factors.included_claim_count) * 0.08
    : 0;
  confidence -= Math.min(factors.blocked_or_excluded_claim_count, 3) * 0.03;
  return Math.max(0, Math.min(1, round2(confidence)));
}

function statusForOutline(confidence, factors, coverage) {
  if (factors.included_claim_count === 0 || factors.blocked_or_excluded_claim_count > 0) {
    return factors.included_claim_count === 0 ? "blocked" : "low_confidence";
  }
  if (coverage.coverage_level === "insufficient_sources") {
    return "insufficient_sources";
  }
  if (confidence >= 0.75 && factors.disagreement_count === 0 && factors.approved_source_policy_count > 0) {
    return "auto_published";
  }
  if (confidence >= 0.6) {
    return "auto_draft";
  }
  if (confidence >= 0.35) {
    return "low_confidence";
  }
  return "insufficient_sources";
}

function buildOutlineForMatch(match, context) {
  const matchClaims = (context.claims || []).filter((claim) => claim.match_id === match.id);
  const claims = dedupeClaims(matchClaims);
  const sectionBuckets = Object.fromEntries(SECTION_FIELD_NAMES.map((field) => [field, []]));

  for (const claim of claims) {
    sectionBuckets[sectionForClaim(claim)].push(claim.id);
  }

  sectionBuckets.consensus_claim_ids = claims
    .filter((claim) => !isDisagreementClaim(claim) && (claim.confidence_factors?.supporting_source_count || 0) >= 2)
    .map((claim) => claim.id);
  sectionBuckets.disagreement_claim_ids = claims.filter(isDisagreementClaim).map((claim) => claim.id);

  for (const field of SECTION_FIELD_NAMES) {
    sectionBuckets[field] = unique(sectionBuckets[field]);
  }

  const coverage = coverageForClaims(claims, context);
  const factors = confidenceFactorsForClaims(claims, context, matchClaims.length);
  const confidence = confidenceForFactors(factors);
  const status = statusForOutline(confidence, factors, coverage);

  return {
    id: `outline-${match.id}-sample`,
    match_id: match.id,
    claim_ids: claims.map((claim) => claim.id),
    section_order: SECTION_ORDER,
    ...sectionBuckets,
    missing_inputs: unique([
      ...missingInputsForClaims(claims),
      ...(coverage.approved_source_policy_count === 0 ? ["approved source policy"] : []),
      ...(coverage.coverage_level === "insufficient_sources" ? ["sufficient independent sources"] : [])
    ]),
    source_coverage: coverage,
    confidence,
    confidence_factors: factors,
    uncertainty: uncertaintyForClaims(claims),
    status,
    generation_version: GENERATION_VERSION,
    generation_stability_key: `outline-${match.id}:${GENERATION_VERSION}`,
    created_at: FIXED_GENERATED_AT,
    updated_at: FIXED_GENERATED_AT
  };
}

function buildOutlines(context) {
  return context.matches.map((match) => buildOutlineForMatch(match, context));
}

function teamName(teamMap, id) {
  return teamMap.get(id)?.name || id || "未定";
}

function sectionText(claimIds, claimMap, status, options = {}) {
  const claims = claimIds.map((id) => claimMap.get(id)).filter(Boolean);
  if (claims.length === 0) {
    return "";
  }
  const prefix = status === "insufficient_sources" || status === "low_confidence"
    ? "現時点の構造化claimでは、"
    : "";
  const texts = claims
    .map((claim) => claim.claim_text_ja)
    .filter(Boolean)
    .map((text) => text.replace(/[。.!！?？]+$/u, ""));
  const joined = texts.join("。また、");
  if (options.disagreement) {
    return `${prefix}${joined}。ただし、ソース間の見方が分かれているため、どちらか一方を確定的な結論として扱わない。`;
  }
  return `${prefix}${joined}。`;
}

function limitationsText(missingInputs) {
  if (!missingInputs || missingInputs.length === 0) {
    return "";
  }
  return `不足している入力: ${missingInputs.join("、")}。このため、レビューはsample / dry-runとして扱う。`;
}

function buildSections(outline, claimMap) {
  return {
    match_flow: {
      claim_ids: outline.match_flow_claim_ids,
      body_ja: sectionText(outline.match_flow_claim_ids, claimMap, outline.status)
    },
    initial_shapes: {
      claim_ids: outline.initial_shape_claim_ids,
      body_ja: sectionText(outline.initial_shape_claim_ids, claimMap, outline.status)
    },
    in_possession: {
      claim_ids: outline.in_possession_claim_ids,
      body_ja: sectionText(outline.in_possession_claim_ids, claimMap, outline.status)
    },
    out_of_possession: {
      claim_ids: outline.out_of_possession_claim_ids,
      body_ja: sectionText(outline.out_of_possession_claim_ids, claimMap, outline.status)
    },
    transitions: {
      claim_ids: outline.transition_claim_ids,
      body_ja: sectionText(outline.transition_claim_ids, claimMap, outline.status)
    },
    adjustments: {
      claim_ids: outline.adjustment_claim_ids,
      body_ja: sectionText(outline.adjustment_claim_ids, claimMap, outline.status)
    },
    substitutions: {
      claim_ids: outline.substitution_claim_ids,
      body_ja: sectionText(outline.substitution_claim_ids, claimMap, outline.status)
    },
    turning_points: {
      claim_ids: outline.turning_point_claim_ids,
      body_ja: sectionText(outline.turning_point_claim_ids, claimMap, outline.status)
    },
    key_players: {
      claim_ids: outline.key_player_claim_ids,
      body_ja: sectionText(outline.key_player_claim_ids, claimMap, outline.status)
    },
    source_consensus: {
      claim_ids: outline.consensus_claim_ids,
      body_ja: outline.consensus_claim_ids.length
        ? sectionText(outline.consensus_claim_ids, claimMap, outline.status)
        : ""
    },
    source_disagreement: {
      claim_ids: outline.disagreement_claim_ids,
      body_ja: sectionText(outline.disagreement_claim_ids, claimMap, outline.status, { disagreement: true })
    },
    limitations: {
      claim_ids: [],
      body_ja: limitationsText(outline.missing_inputs)
    }
  };
}

function buildGeneratedReview(outline, context) {
  const match = context.matchMap.get(outline.match_id);
  const home = teamName(context.teamMap, match?.home_team_id);
  const away = teamName(context.teamMap, match?.away_team_id);
  const claimMap = context.claimMap;
  const claimRecords = outline.claim_ids.map((id) => claimMap.get(id)).filter(Boolean);
  const refs = refsForClaims(claimRecords);
  const sections = buildSections(outline, claimMap);
  const hasDisagreement = outline.disagreement_claim_ids.length > 0;

  return {
    id: `generated-${outline.match_id}-dry-run`,
    match_id: outline.match_id,
    outline_id: outline.id,
    title_ja: `${home} vs ${away} 自動生成レビュー案`,
    short_summary_ja: outline.status === "blocked"
      ? "構造化claimが不足しているため、本文生成を止めたsample / dry-runレビューです。"
      : outline.status === "insufficient_sources"
        ? "構造化claimに基づくsample / dry-runレビューです。ソース不足と未承認ポリシーを明示し、断定を避けます。"
        : "構造化claimをもとに生成した日本語レビュー案です。",
    sections,
    source_coverage: outline.source_coverage,
    confidence: outline.confidence,
    status: outline.status,
    missing_inputs: outline.missing_inputs,
    uncertainty: outline.uncertainty,
    disagreement_summary_ja: hasDisagreement
      ? "ソース間で評価が分かれるclaimがあるため、相違点を独立した節に分けて扱う。"
      : "",
    source_ids: refs.sourceIds,
    article_ids: refs.articleIds,
    claim_ids: outline.claim_ids,
    generation_version: outline.generation_version,
    generation_stability_key: `generated-${outline.match_id}:${outline.generation_version}`,
    generated_at: FIXED_GENERATED_AT,
    updated_at: FIXED_GENERATED_AT
  };
}

function buildGeneratedReviews(context, outlines = context.outlines) {
  return stableById(outlines).map((outline) => buildGeneratedReview(outline, context));
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

module.exports = {
  ALLOWED_STATUSES,
  FIXED_GENERATED_AT,
  GENERATION_VERSION,
  OUTLINE_REQUIRED_FIELDS,
  PRIMARY_SECTION_FIELD_NAMES,
  PROHIBITED_CONTENT_FIELDS,
  REVIEW_REQUIRED_FIELDS,
  SECTION_FIELD_NAMES,
  SECTION_ORDER,
  buildContext,
  buildGeneratedReview,
  buildGeneratedReviews,
  buildOutlineForMatch,
  buildOutlines,
  confidenceFactorsForClaims,
  confidenceForFactors,
  coverageForClaims,
  ids,
  isDisagreementClaim,
  readJson,
  refsForClaims,
  stableStringify,
  statusForOutline,
  unique
};
