# WorldCup2026Hub

WorldCup2026Hub is an automated multilingual match review generation platform for the 2026 FIFA World Cup.

The finished system is intended to collect approved multilingual sources, organize article metadata and extraction notes by match and team, generate original Japanese match reviews, and publish updated static pages automatically.

Automatic collection, automatic generation, and automatic publishing are the target operating model.

Public v0.1 is a preview of that model using sample and dry-run data only.

Published URL: https://mantanak-jp.github.io/worldcup2026hub/

WorldCup2026Hub lets readers check Japanese reviews organized from tactical reviews, match analysis, local media reports, official information, and other source categories without visiting every country-specific site one by one.

It is not an external article reposting site or a translated-article roundup. The site shows source metadata and links so readers can verify the original sources when needed, while the generated review itself is intended to be an original Japanese review.

## Goals

- Generate original Japanese match reviews from multiple source categories.
- Track source coverage, confidence, generation version, and update history.
- Keep code changes PR-based while allowing approved tournament data updates, generated reviews, site artifacts, and Pages output to be automated during operation.
- Keep the current implementation path free of paid external APIs, secrets, and billing-account dependencies; source content storage is governed by explicit source policy.

## Repository Structure

```text
.
|-- data/
|-- docs/
|-- index.html
|-- match.html
|-- team.html
|-- app.js
|-- detail.js
|-- styles.css
|-- detail.css
`-- README.md
```

## Getting Started

This repository currently contains a plain static MVP and planning documents for the automated review platform. Crawler implementation, scheduled workflows, and Pages deployment automation are intentionally staged for later PRs.

The current public-readiness target is honest preview content: source targets remain disabled, real crawling has not started, paid APIs are not used, and generated reviews are sample outputs with visible confidence and source coverage.

Public v0.1 copy and UI labels are primarily Japanese for readers, while technical docs and data field names may remain English.

## Documentation

- [Project Overview](docs/overview.md)
- [Operations Notes](docs/operations.md)
- [Site Concept](docs/site_concept.md)
- [Product Requirements](docs/product_requirements.md)
- [Source Registry Specification](docs/source_registry_spec.md)
- [Crawler Pipeline Specification](docs/crawler_pipeline_spec.md)
- [Review Generation Specification](docs/review_generation_spec.md)
- [Article Extraction Specification](docs/article_extraction_spec.md)
- [Publishing Automation Specification](docs/publishing_automation_spec.md)
- [Data Model](docs/data_model.md)
- [Crawler Future Plan](docs/crawler_future_plan.md)
- [Development Workflow](docs/development_workflow.md)
- [v0.1 Release Checklist](docs/v01_release_checklist.md)

## Static MVP

The current site shell is plain HTML, CSS, JavaScript, and JSON so it can run directly on GitHub Pages without a build step.

- `index.html`: top page, match list, team list, and coverage status sections.
- `styles.css`: responsive layout and visual styling.
- `app.js`: client-side JSON loading and rendering for the MVP shell.
- `match.html` / `team.html`: detail page shells driven by URL `id` parameters.
- `data/*.json`: static data records for matches, teams, reports, reviews, sources, and update history.
- `data/articles.json` / `data/article_extractions.json`: metadata-only article input scaffold and short original extraction notes.
- `data/crawl_runs.json`: planned and dry-run crawler run history scaffold; no real crawling is enabled.
- `tools/generate_match_review_sample.js`: local-only deterministic review generation dry-run with no external API or network access.
- `tools/normalize_article_extractions.js`: local-only extraction reference validator with graceful fallback when article scaffold files are absent.
- Automation scaffold JSON files define future source registry and generated review records without enabling crawler targets.
