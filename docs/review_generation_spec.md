# Review Generation Specification

Generated match reviews are original Japanese reviews based on multiple source articles and structured match data.

They are not translations, copied summaries, or link collections.

## Review Goals

Each generated review should:

- Explain the match flow
- Identify initial tactical shapes
- Highlight key tactical themes
- Describe turning points
- Identify key players
- Explain substitutions and adjustments
- Separate source consensus from source disagreement
- Explain implications for the next match

## Required Links

Generated reviews should be linked to:

- `match_id`
- `source_ids`
- `article_ids`
- `generation_run_id`
- `version`

## Review Fields

- `title_ja`
- `short_summary_ja`
- `match_flow`
- `initial_shapes`
- `key_tactical_themes`
- `turning_points`
- `key_players`
- `substitutions_and_adjustments`
- `source_consensus`
- `source_disagreement`
- `next_match_implications`
- `source_coverage`
- `confidence`
- `generated_at`
- `version`
- `status`
- `source_ids`
- `article_ids`
- `generation_run_id`

## Status Values

- `not_generated`
- `collecting`
- `generation_pending`
- `auto_draft`
- `auto_published`
- `auto_updated`
- `low_confidence`
- `insufficient_sources`
- `blocked`
- `failed`

## Auto Publication

`auto_published` reviews are allowed. Human review is not required for every generation run.

The UI should clearly display source coverage, confidence, generation version, generated time, and review status so readers can judge quality.

Manual review can be used for low-confidence, insufficient-source, or unresolved-policy reviews, but it is not a required gate for every generated review.

## Copyright Guardrails

Generated reviews must not include copied article bodies, long quotations, or external images.

They may cite source metadata and link to original sources. They should synthesize across sources in original Japanese prose.

## Local Dry-Run Generator

`tools/generate_match_review_sample.js` is a deterministic local-only sample generator.

It reads local JSON files, writes a sample generated review to stdout, and does not call external APIs, access the network, use secrets, add paid services, or persist external article bodies or images.

The script is intended for schema validation and workflow dry-runs before any approved production generator is introduced.

Review generation in the current path must not use paid external APIs, metered billing APIs, API keys, secrets, or billing accounts.

Full external article text may be used as an input only in a future implementation where the source policy explicitly allows that use and the user has approved the source policy. Unreviewed sources default to metadata, URL, extraction notes, and generated review output only.

## Extraction Inputs

Local generators may read `data/articles.json` and `data/article_extractions.json` when present.

Article extraction input must remain source-based and metadata-oriented. Generators may use short original extraction notes, linked claim IDs, confidence, missing inputs, source IDs, and article IDs. They must not invent tactical claims or infer coach intent beyond local source-based records.

Generated reviews should carry `missing_inputs` forward so the UI can explain why a review remains `insufficient_sources` or `low_confidence`.

## Claim Inputs

Review generation should prefer validated `data/tactical_claims.json` records over free-form extraction text. Claims must carry supporting extraction, article, and source references. Unsupported claims should be excluded from outlines and generated reviews.

Claim confidence, confidence factors, uncertainty, disagreement status, and missing inputs should flow into review outlines so low-confidence or disputed points are not presented as settled conclusions.

When `disagreement_status` is not `none`, generators should route the claim to source-disagreement sections or low-confidence review notes. They should not promote either side into consensus unless later normalized claims provide stronger supporting source coverage.

The local generators retain read-only fallback support for the legacy `claim_ja` field, but new generated review inputs should use `claim_text_ja`.

## Outline Inputs

`data/review_outlines.json` is the deterministic aggregation layer between tactical claims and generated Japanese reviews. Each outline must include stable IDs, match ID, all included claim IDs, section order, per-section claim ID arrays, missing inputs, source coverage, confidence, confidence factors, uncertainty, status, generation version, generation stability key, and timestamps.

Section mapping is deterministic:

- `match_flow_claim_ids`: `claim_type=match_flow`
- `initial_shape_claim_ids`: `claim_type=initial_shape`
- `in_possession_claim_ids`: `tactical_phase=in_possession`
- `out_of_possession_claim_ids`: `tactical_phase=out_of_possession`, unless the claim is a disagreement
- `transition_claim_ids`: `tactical_phase=transition_attack` or `transition_defense`
- `adjustment_claim_ids`: `claim_type=adjustment`
- `substitution_claim_ids`: `claim_type=substitution_impact` or `tactical_phase=substitution`
- `turning_point_claim_ids`: `claim_type=turning_point` or `tactical_phase=game_state`
- `key_player_claim_ids`: `claim_type=key_player_role`
- `consensus_claim_ids`: non-disagreement claims with at least two supporting sources
- `disagreement_claim_ids`: `claim_type=source_disagreement` or `disagreement_status != none`

Unsupported, failed, or blocked claims are excluded. Empty sections remain empty; generators must not fill them with generic tactical commentary.

## Confidence And Status Aggregation

Outline and review confidence is a local quality signal. It starts from available claim confidence and adjusts for included claim count, source count, article count, extraction count, language diversity, source type diversity, approved source policy count, disagreement count, missing input count, low-confidence claim ratio, and excluded/blocked claims.

Status is deterministic:

- `blocked`: no included claims
- `insufficient_sources`: source/article/extraction coverage or source policy is insufficient
- `low_confidence`: claims exist but confidence remains too low for draft quality
- `auto_draft`: sufficient coverage and moderate confidence
- `auto_published`: only when confidence is high, source policy support exists, and no disagreement remains
- `failed`: reserved for generator or validation failures

Sample data should not become `auto_published` unless approved source policy and sufficient evidence are present.

## Generated Review Contract

`data/generated_match_reviews.json` should derive from outlines and include `id`, `match_id`, `outline_id`, `title_ja`, `short_summary_ja`, `sections`, `source_coverage`, `confidence`, `status`, `missing_inputs`, `uncertainty`, `disagreement_summary_ja`, `source_ids`, `article_ids`, `claim_ids`, `generation_version`, `generation_stability_key`, `generated_at`, and `updated_at`.

`sections` contains `match_flow`, `initial_shapes`, `in_possession`, `out_of_possession`, `transitions`, `adjustments`, `substitutions`, `turning_points`, `key_players`, `source_consensus`, `source_disagreement`, and `limitations`. A section with no supporting claims should have an empty body rather than generic filler.

## Local Pipeline Tools

- `tools/generate_review_outline_sample.js`: validated claims to deterministic outlines
- `tools/normalize_review_outlines.js`: outline contract and deterministic recalculation validator
- `tools/generate_structured_review_sample.js`: outlines to deterministic generated reviews
- `tools/generate_match_review_sample.js`: backward-compatible single-match wrapper

These tools are local-only. They do not crawl, access the network, call external APIs, use secrets, store article bodies, store translated article text, or save external images.
