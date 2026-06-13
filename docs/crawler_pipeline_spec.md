# Crawler Pipeline Specification

The crawler pipeline is a core part of the final WorldCup2026Hub system. This specification defines the intended behavior without adding implementation in this PR.

## Schedules

The baseline scheduled crawler should run about once per hour during tournament operation.

Match-window crawling should increase focus around each match:

- Matchday minus 72 hours to kickoff: preview and team-news discovery.
- Kickoff to final whistle: official and live metadata discovery.
- Match end to 6 hours after match: high-frequency reports, official comments, and first tactical reactions.
- 6 to 48 hours after match: detailed tactical analysis, long-form reviews, and statistics.
- 48 hours to 7 days after match: late analysis and follow-up comments.

## Discovery Inputs

The crawler should combine:

- Source registry records that satisfy the operational gate
- RSS feeds
- Sitemaps
- Site search
- Search queries
- Approved APIs when explicitly approved
- Custom fetchers for approved sources only

`data/source_candidates.json` is not crawler input. Candidate records are research and policy-review records only. The crawler trust boundary starts at `data/source_registry.json`, and only records with active approval, `runtime_status=enabled`, compatibility `enabled=true`, complete policy evidence, and an approved crawl method may be used by scheduled crawling.

## Pipeline Steps

1. Article discovery
2. Metadata extraction
3. Language detection
4. Match linking
5. Team linking
6. Duplicate detection
7. Source type classification
8. Extraction generation
9. Review regeneration trigger
10. Update history recording

## Article Metadata

Article records should store metadata and references, not full external article bodies.

Typical metadata:

- source ID
- URL
- title
- published time
- discovered time
- language
- source category
- related match IDs
- related team IDs
- extraction status
- allowed-use status

## Failure Handling

The crawler should record:

- failed source
- failed URL or discovery method
- failure category
- retry eligibility
- timestamp
- impact on review generation

Crawler failures should not block the whole site. They should reduce source coverage and confidence where relevant.

## Crawl Run Records

`data/crawl_runs.json` records planned, dry-run, scheduled, and match-window crawler activity.

In the current scaffold, crawl run records are samples only. They must not imply that real crawling has happened.

Minimum fields include `id`, `run_type`, `status`, `trigger`, `started_at`, `completed_at`, `source_ids`, `discovered_article_count`, `stored_article_count`, `extraction_count`, `error_count`, `policy_blocked_count`, and `notes`.

Source targets must remain `enabled=false` until user approval. Dry-run records must not call external APIs, use paid APIs, store full text, store external images, or execute a real crawler.

`tools/validate_source_contracts.js` runs before article/extraction validation in the local Level 3 pipeline. If source contracts are invalid, later crawler or review-generation checks must not run.
