# Site Concept

WorldCup2026Hub is an automated multilingual match review generation platform for the 2026 FIFA World Cup.

The completed site assumes automatic collection, automatic generation, and automatic publishing as normal operation.

Public v0.1 is not the completed system. It is a static preview using sample and dry-run data so the page structure, source coverage display, confidence display, and generated review status can be reviewed before real crawling, source enablement, or publishing automation is enabled.

## Product Promise

The value of the site is not a match list or a collection of links. Its value is original Japanese match reviews generated from multiple languages, multiple source categories, and multiple viewpoints.

For readers, the promise is simple:

- Read an organized Japanese review without visiting every country-specific site individually
- Understand the main tactical themes, match flow, adjustments, turning points, and major player performances
- See where multiple sources agree and where their interpretations differ
- Judge the amount and quality of available evidence through source coverage, confidence, status, and missing inputs
- Follow the tournament by match and by team
- Open the original sources only when deeper verification is needed

The normal reading experience should be complete enough on WorldCup2026Hub to understand the major points. Source metadata and links provide a transparent path back to the original articles when needed.

## Reader Problem

High-quality World Cup analysis is distributed across countries, languages, tactical sites, local media, official sources, and individual reporters. A reader who wants a broad view must repeatedly search, translate, compare, and judge those sources.

WorldCup2026Hub reduces that discovery and language burden. It does not replace the original sources; it organizes their relevant perspectives into an original Japanese review and makes the basis of that review visible.

## Completed Site Vision

For each match, WorldCup2026Hub should collect and organize:

- Domestic and international tactical analysis
- Detailed match reports
- Official information
- Statistics and event data
- Manager comments
- Player comments
- Previews and long-form analysis
- Video-analysis metadata when allowed

The site should then generate an original Japanese review that explains:

- Match flow
- Initial tactical shapes
- Attacking and defensive structures
- Key adjustments and substitutions
- Turning points
- Major player performances
- Source consensus
- Source disagreement
- Missing evidence and unresolved points

The same structure should support both match-based and team-based navigation so readers can follow a team across the tournament and observe tactical changes over time.

## Product Boundaries

WorldCup2026Hub is not:

- An external article reposting site
- A translated-article roundup
- A long-quote archive
- An external article-body or image archive
- A simple news-link collection
- An independent video-analysis system that invents tactical findings absent from sources
- A system that hides weak evidence behind confident prose

It should publish source-aware original Japanese reviews while preserving copyright, terms-of-service, robots.txt, and source-policy guardrails.

When evidence is limited, the site should show low confidence, insufficient sources, missing inputs, a shorter review, or no review. It should not fill gaps with unsupported claims.

## Pages Versus Pipeline

GitHub Pages is the presentation layer. The core product is the pipeline that:

1. Collects approved sources
2. Extracts article metadata and short original notes
3. Links articles to matches and teams
4. Detects language and classifies source type
5. Organizes tactical claims and disagreements
6. Generates original Japanese review versions
7. Publishes updated static pages

## Auto Publication

The platform is designed for automatic publication. Human review should not be required for every generated review during tournament operation.

Once approved source registries, workflows, generators, and publishing paths are merged, routine tournament-operation runs may publish generated reviews and site updates automatically.

Automatic publication depends on visible quality information and safe failure behavior. The UI must display:

- Source coverage
- Confidence
- Generation version
- Generated time
- Review status
- Source list and source categories
- Missing inputs

Low-confidence or insufficient-source reviews may still be visible if their status is clear.

## Public v0.1 Readiness

The first public version should clearly state that:

- Source registry entries are candidates unless explicitly approved
- No source target is enabled
- No real crawler is running
- No paid API, secret, billing account, DB, or auth is used
- Generated reviews are sample or dry-run outputs until approved automation produces tournament data
- Initial GitHub Pages publication has been verified at `https://mantanak-jp.github.io/worldcup2026hub/`
- Future Pages deployment automation or publication-setting changes require user confirmation

## Requirements

The normative product requirements, functional requirements, guardrails, non-goals, and completion criteria are defined in [Product Requirements](product_requirements.md).
