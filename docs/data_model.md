# Data Model

WorldCup2026Hub starts with static JSON files that can be read directly by a GitHub Pages-compatible site. The model is intentionally simple and migration-friendly, but the final system is an automated collection and generated-review platform.

## Files

- `data/matches.json`: match schedule, teams, scores, and links to report/review records.
- `data/teams.json`: team profiles and qualification/profile status.
- `data/sources.json`: source metadata and original Japanese notes.
- `data/result_reports.json`: result report status and concise original summaries.
- `data/tactical_reviews.json`: tactical review status and draft review fields.
- `data/update_history.json`: manual or future automated update events.
- `data/source_registry.json`: approved and candidate crawler sources, including policy status and enablement.
- `data/crawl_runs.json`: scheduled crawler and match-window crawler run records.
- `data/articles.json`: metadata-only article registry linked to sources, matches, teams, policy state, and duplicate-detection keys.
- `data/article_extractions.json`: short original extraction notes and structured source-based tags linked to articles, sources, matches, teams, and tactical claims.
- `data/review_generation_runs.json`: generation run metadata, model/prompt version, inputs, status, and confidence.
- `data/review_outlines.json`: deterministic claim aggregation records by match, with section claim IDs, source coverage, confidence factors, missing inputs, uncertainty, and status.
- `data/generated_match_reviews.json`: original Japanese generated match reviews linked to outlines, claims, sources, and articles.

## Automation Scaffold Files

The automation scaffold defines future data shapes. It is not crawler implementation and does not enable any source target.

### `data/source_registry.json`

Defines candidate and approved source records. Key fields include `id`, `name`, `base_url`, `languages`, `source_category`, `crawl_method`, `robots_policy_status`, `terms_policy_status`, `allowed_use`, `content_storage_policy`, `full_text_storage_allowed`, `paid_api_required`, `api_cost_policy`, `enabled`, and `priority`.

`enabled=true` is a boundary change and requires user confirmation. Wave 1 sample records must remain `enabled=false`.

Paid APIs are not used. Sources requiring API keys, secrets, billing accounts, or metered paid APIs must remain disabled until explicitly approved.

External content storage is controlled by source policy. The default is metadata, URL, extraction notes, and generated review text. Full text storage is only a future possibility when source policy explicitly allows it and the user approves that source policy.

### `data/review_generation_runs.json`

Tracks local or automated generation runs. Key fields include `id`, `match_id`, `status`, `trigger`, `input_source_ids`, `input_article_ids`, `generator_name`, `prompt_version`, `generation_version`, `source_coverage`, `confidence`, `started_at`, `completed_at`, and `notes`.

### `data/review_outlines.json`

Stores the deterministic bridge from `tactical_claims` to generated reviews. Key fields include `id`, `match_id`, `claim_ids`, `section_order`, section-specific claim ID arrays, `missing_inputs`, `source_coverage`, `confidence`, `confidence_factors`, `uncertainty`, `status`, `generation_version`, `generation_stability_key`, `created_at`, and `updated_at`.

`source_coverage` includes source, article, extraction, language, source type, source policy, metadata-only, and coverage-level signals. Outline confidence is deterministic and should be recalculated by `tools/normalize_review_outlines.js`.

### `data/generated_match_reviews.json`

Stores generated Japanese match reviews. Key fields include `id`, `match_id`, `outline_id`, `title_ja`, `short_summary_ja`, `sections`, `source_coverage`, `confidence`, `status`, `missing_inputs`, `uncertainty`, `disagreement_summary_ja`, `source_ids`, `article_ids`, `claim_ids`, `generation_version`, `generation_stability_key`, `generated_at`, and `updated_at`.

Generated reviews must not include copied article bodies, long quotations, or external images.

## Principles

- Keep unreviewed external content as metadata, links, extraction notes, and generated review outputs.
- Do not store copied article bodies or external images unless the source policy explicitly allows it and the user has approved that source policy.
- Do not use paid external APIs, metered billing APIs, API keys, secrets, or billing accounts in the current implementation path.
- Use stable IDs so pages can link to records before final data exists.
- Keep status fields explicit so incomplete areas are visible in the UI.
- Preserve a shape that can later move to Astro, MDX, or generated pages.
- Make generated review quality visible through source coverage, confidence, generation version, and status.
- Support automated tournament-operation updates after source registry, workflow, generator, and publishing paths are approved and merged.

## Common Status Values

- `scheduled`: match has not started.
- `live`: match is in progress.
- `final`: match result is final.
- `not_started`: report or review has not started.
- `draft`: record exists but needs review.
- `review_needed`: record needs manual review before publication.
- `published`: record is ready for display.
- `blocked`: record should not be published or used yet.
- `manual-review-needed`: source metadata needs human confirmation.
- `approved-reference`: source metadata is approved for link and metadata display.
- `not_generated`: generated review does not exist yet.
- `collecting`: crawler is collecting candidate articles.
- `extracted`: article metadata or extraction is complete.
- `generation_pending`: enough input exists and review generation is queued.
- `auto_draft`: review was generated but not auto-published.
- `auto_published`: review was generated and published automatically.
- `auto_updated`: published review was regenerated with newer source coverage.
- `low_confidence`: generated review is visible but confidence is low.
- `insufficient_sources`: source coverage is too thin for a full review.
- `failed`: crawl, extraction, generation, or publish step failed.

## Source Handling

Sources are references. A source record may include URL, source name, language, source type, related match/team IDs, checked status, extraction notes, and concise Japanese notes.

Future source registry records should include `content_storage_policy`, `full_text_storage_allowed`, `full_text_storage_status`, `paid_api_required`, and `api_cost_policy` so content and cost boundaries are explicit before automation uses the source.

Unreviewed sources must default to no full text storage, no external image storage, and no paid API usage.

## Generated Review Handling

Generated reviews are original Japanese synthesis based on review outlines, source-grounded claims, and structured match data. They should link to outline IDs, claim IDs, source IDs, and article IDs. They must not include copied article bodies, long quotations, translated article bodies, or external images.

Generated review `sections` should include `match_flow`, `initial_shapes`, `in_possession`, `out_of_possession`, `transitions`, `adjustments`, `substitutions`, `turning_points`, `key_players`, `source_consensus`, `source_disagreement`, and `limitations`. Sections without supporting claims stay empty except `limitations`, which may summarize missing inputs.

## Article And Extraction Handling

`data/articles.json` is metadata-only. It may include article URL, canonical URL, title, source ID, language, source category, article type, related match/team IDs, author/publisher metadata, timestamps, extraction status, content storage policy, duplicate-detection keys, generation stability keys, and `full_text_stored=false`.

`data/article_extractions.json` stores short original Japanese extraction notes, topic tags, tactical phases, tactical themes, named players/managers, supporting source/article IDs, opposing source/article IDs, linked claim IDs, uncertainty, disagreement notes, evidence metadata, confidence, and missing inputs. These notes are the bridge from source metadata to `tactical_claims`; they are not copied article bodies, translations, close paraphrases, or long quotations.

Article IDs, extraction IDs, source IDs, match IDs, team IDs, and linked claim IDs should be stable and validator-checkable. Article `source_id` may refer to `data/sources.json` or `data/source_registry.json` while the project transitions from display sources to crawler registry records.

`tools/normalize_article_extractions.js` validates the local article/extraction contract. It checks root array shape, duplicate IDs, required fields, source/match/team/article/claim references, status and language values, missing-input arrays, confidence ranges, and suspicious content fields that could indicate article body or image storage.

Unapproved sources must remain metadata-only or manual-review-needed until source policy review is complete.

## Tactical Claim Handling

`data/tactical_claims.json` stores source-grounded Level 3 tactical claims. A claim should include stable IDs, match/team references, claim type, tactical phase/theme, concise original Japanese claim text, supporting extraction/article/source IDs, optional opposing extraction/article/source references, confidence factors, uncertainty, disagreement status, missing inputs, duplicate key, generation stability key, timestamps, and status.

Claims without supporting extraction, article, and source references are invalid. Article and source refs are validated against the extraction records so unsupported claims cannot enter generated reviews. Claim confidence is a deterministic local quality signal based on source count, article count, extraction count, language/source-type diversity, source policy state, opposing evidence, extraction confidence, metadata-only evidence, and missing inputs.

`tools/normalize_tactical_claims.js` validates the claim layer without creating new claims or accessing external sources. New data should use `claim_text_ja`, `team_ids`, `tactical_phase`, and `tactical_theme`; local generators keep read-only fallback support for older `claim_ja` fixtures only.

## Review Outline And Generation Handling

`tools/generate_review_outline_sample.js` aggregates validated tactical claims by match and emits deterministic outlines. `tools/normalize_review_outlines.js` validates saved outlines against the same deterministic rules. `tools/generate_structured_review_sample.js` generates outline-derived Japanese review records. `tools/generate_match_review_sample.js` remains a backward-compatible wrapper for one match.

This local pipeline is a sample / dry-run path. It does not run real crawling, call external APIs, use secrets, add paid services, deploy Pages, commit back to the repository, or store external article bodies/images.

## Crawl Run Handling

`data/crawl_runs.json` records planned, dry-run, scheduled, and match-window crawler runs. Early records may be samples with zero discovered/stored/extracted counts so the UI and workflow can validate shape before real crawling is approved.

Crawl run records should include policy-blocked counts and notes so disabled or unapproved sources remain visible without being used.
