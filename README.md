# WorldCup2026Hub

WorldCup2026Hub is an automated multilingual match review generation platform for the 2026 FIFA World Cup.

The finished system is intended to collect approved multilingual sources, organize article metadata and extraction notes by match and team, generate original Japanese match reviews, and publish updated static pages automatically.

Automatic collection, automatic generation, and automatic publishing are the target operating model.

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

## Documentation

- [Project Overview](docs/overview.md)
- [Operations Notes](docs/operations.md)
- [Site Concept](docs/site_concept.md)
- [Source Registry Specification](docs/source_registry_spec.md)
- [Crawler Pipeline Specification](docs/crawler_pipeline_spec.md)
- [Review Generation Specification](docs/review_generation_spec.md)
- [Publishing Automation Specification](docs/publishing_automation_spec.md)
- [Data Model](docs/data_model.md)
- [Crawler Future Plan](docs/crawler_future_plan.md)
- [Development Workflow](docs/development_workflow.md)

## Static MVP

The current site shell is plain HTML, CSS, JavaScript, and JSON so it can run directly on GitHub Pages without a build step.

- `index.html`: top page, match list, team list, and coverage status sections.
- `styles.css`: responsive layout and visual styling.
- `app.js`: client-side JSON loading and rendering for the MVP shell.
- `match.html` / `team.html`: detail page shells driven by URL `id` parameters.
- `data/*.json`: static data records for matches, teams, reports, reviews, sources, and update history.
