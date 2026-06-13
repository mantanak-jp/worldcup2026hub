# Source Registry Specification

The source registry defines which approved operational sites or feeds may be used by the crawler and how they may be used.

No crawler target should be enabled until robots.txt, terms of service, and allowed use have been reviewed.

Unapproved candidates and fixtures belong in `data/source_candidates.json`, not in `data/source_registry.json`. The current six disabled records in `data/source_registry.json` are tolerated only as legacy pending-migration records and must not be treated as approved operational sources.

## Fields

- `id`: stable source identifier.
- `name`: human-readable source name.
- `base_url`: source home URL.
- `languages`: list of expected languages.
- `country_or_region`: primary country or region.
- `source_category`: source role list. Use an array even when the source currently has one category.
- `crawl_method`: discovery or fetch method.
- `discovery_methods`: list of discovery approaches.
- `access_type`: public, paywalled, API, manual, or disabled.
- `robots_policy_status`: review status for robots.txt and site rules.
- `terms_policy_status`: review status for terms of service or equivalent site policy.
- `allowed_use`: allowed repository use.
- `content_storage_policy`: allowed content storage mode for this source.
- `full_text_storage_allowed`: whether full article text may be stored for this source.
- `full_text_storage_status`: review status for full text storage.
- `paid_api_required`: whether use of this source requires a paid API.
- `api_cost_policy`: cost policy for source access.
- `priority`: crawl and review priority.
- `enabled`: whether scheduled crawling may use this source.
- `approval_status`: reviewed approval level for operational use.
- `runtime_status`: operational state separate from approval.
- `policy_evidence`: structured robots, terms, copyright, access, storage, and cost review references.
- `external_image_storage_allowed`: whether external image storage is allowed; this must default to `false`.
- `notes`: concise operational notes.

## Source Categories

- `tactical_analysis`
- `match_report`
- `official`
- `statistics`
- `manager_comment`
- `player_comment`
- `preview`
- `longform_analysis`
- `video_analysis`

## Crawl Methods

- `rss`
- `sitemap`
- `site_search`
- `search_api`
- `custom_fetcher`
- `disabled`

## Enablement Rule

`enabled=true` requires all of the following:

- robots.txt reviewed
- terms of service reviewed
- allowed use reviewed
- no unresolved copyright or redistribution concern
- no paid external API, metered billing API, API key, secret, or billing account requirement
- content storage policy reviewed
- `approval_status` is one of `approved_metadata_only`, `approved_metadata_and_short_notes`, or `approved_for_review_generation`
- `runtime_status=enabled`
- compatibility `enabled=true`
- approved crawl method is present and is not `disabled`
- policy evidence includes robots, terms, copyright, and access references

If any item is unknown, the source must remain `enabled=false`.

After a source is reviewed, approved, and set to `enabled=true`, scheduled crawling may use it automatically without per-run confirmation.

## Allowed Use Values

- `metadata-and-link-only`
- `metadata-link-and-short-original-notes`
- `metadata-extraction-notes-and-generated-review`
- `blocked`
- `manual-review-needed`

The default should be `manual-review-needed`.

## Storage And Cost Policy Values

`content_storage_policy` should default to `metadata-only` or `manual-review-needed`.

`full_text_storage_allowed` must default to `false`.

Full external article text may be stored only if the source policy explicitly allows it and the user approves that source policy. Unreviewed sources must not store full text.

External image storage follows the same rule: no storage unless the source policy explicitly allows it and the user approves that source policy.

`paid_api_required` must default to `false` in the current implementation path, and `api_cost_policy` should be `no-paid-api` unless a future user-approved boundary change allows otherwise.

## Candidate Separation

Candidate records use `candidate_status` and policy review fields. They do not authorize crawling, do not carry runtime enablement fields, and do not count as approved source coverage. Promotion preserves the source ID but moves the operational projection into `data/source_registry.json`; the same ID must not exist in both files simultaneously.

## Validator

`tools/validate_source_contracts.js` validates `data/source_candidates.json` and `data/source_registry.json`. It checks root shape, required fields, duplicate IDs, cross-file ID ambiguity, enum values, timestamps, policy evidence, storage/cost guardrails, enabled/runtime consistency, and prohibited body/image/secret-like fields.
