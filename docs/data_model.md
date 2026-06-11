# Data Model

WorldCup2026Hub starts with static JSON files that can be read directly by a GitHub Pages-compatible site. The model is intentionally simple and migration-friendly.

## Files

- `data/matches.json`: match schedule, teams, scores, and links to report/review records.
- `data/teams.json`: team profiles and qualification/profile status.
- `data/sources.json`: source metadata and original Japanese notes.
- `data/result_reports.json`: result report status and concise original summaries.
- `data/tactical_reviews.json`: tactical review status and draft review fields.
- `data/update_history.json`: manual or future automated update events.

## Principles

- Keep external content as metadata and links.
- Do not store copied article bodies or external images.
- Use stable IDs so pages can link to records before final data exists.
- Keep status fields explicit so incomplete areas are visible in the UI.
- Preserve a shape that can later move to Astro, MDX, or generated pages.

## Common Status Values

- `scheduled`: match has not started.
- `live`: match is in progress.
- `final`: match result is final.
- `not_started`: report or review has not started.
- `draft`: record exists but needs review.
- `published`: record is ready for display.
- `manual-review-needed`: source metadata needs human confirmation.

## Source Handling

Sources are references. A source record may include URL, source name, language, source type, related match/team IDs, checked status, and concise Japanese notes. It must not include copied article text or downloaded external images.
