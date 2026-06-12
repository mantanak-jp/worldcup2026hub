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
- `data/articles.json`: discovered article metadata linked to sources, matches, and teams.
- `data/article_extractions.json`: extracted metadata, language, classification, and concise original notes derived from articles.
- `data/review_generation_runs.json`: generation run metadata, model/prompt version, inputs, status, and confidence.
- `data/generated_match_reviews.json`: original Japanese generated match reviews linked to source, article, and generation-run IDs.

## Principles

- Keep external content as metadata and links.
- Do not store copied article bodies or external images.
- Use stable IDs so pages can link to records before final data exists.
- Keep status fields explicit so incomplete areas are visible in the UI.
- Preserve a shape that can later move to Astro, MDX, or generated pages.
- Make generated review quality visible through source coverage, confidence, generation version, and status.

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

Sources are references. A source record may include URL, source name, language, source type, related match/team IDs, checked status, and concise Japanese notes. It must not include copied article text or downloaded external images.

## Generated Review Handling

Generated reviews are original Japanese synthesis based on multiple sources and structured match data. They should link to source IDs, article IDs, and generation run IDs. They must not include copied article bodies, long quotations, or external images.
