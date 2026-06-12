# Publishing Automation Specification

WorldCup2026Hub is intended to publish generated match review updates automatically during tournament operation.

Automatic publishing is the standard operating mode for the finished platform, not an exception.

This document defines the target behavior. It does not add GitHub Actions or Pages configuration in this PR.

## Automation Model

Scheduled workflows may:

- Run approved-source crawlers
- Update data files
- Update generated review files
- Run site build or static export steps
- Commit generated artifacts when appropriate
- Deploy to GitHub Pages

Code changes remain PR-based. Tournament-operation updates to data, generated reviews, site artifacts, and Pages deploys may be automatic.

Once the source registry, workflow, generator, and publishing path are approved and merged, routine tournament-operation runs may update generated reviews, data files, site artifacts, and Pages output automatically without per-review user confirmation.

## GitHub Pages

GitHub Pages is the public display surface. The generated site should expose:

- Latest generated review status
- Generated time
- Source coverage
- Confidence
- Generation version
- Source metadata and links

## Deploy Failure Handling

Deploy failures should:

- Be recorded in update history or workflow logs
- Avoid deleting the last known working site artifact
- Leave generated data available for inspection
- Make the failure visible to maintainers

## Dry-Run Workflow Stage

The first workflow stage may validate local JSON files and deterministic review-generation scripts without publishing anything.

This dry-run stage may use `workflow_dispatch` and a scheduled trigger, but it must not run a crawler, call external APIs, read secrets, commit back to the repository, or deploy to GitHub Pages.

Its purpose is to prove that repository data, local scripts, and generated-review schemas remain valid before an approved production publishing path is introduced.

## Review Status Display

The UI should display states such as:

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

## Human Review

Human review should not be required for every generated review.

Manual review may still be used for:

- New crawler targets
- Low-confidence reviews
- Insufficient-source reviews
- Reviews with unresolved source policy
- Sources with unresolved policy status
- Major generation-prompt changes
- Copyright or terms-of-service risk

Low confidence, insufficient sources, or unresolved policy should be expressed as review status and UI metadata. These states may route items to manual review, but they do not make human review mandatory for every generated review.

## Boundary Changes Requiring Approval

User confirmation is required for:

- Initial GitHub Pages publication settings
- Changes to the Pages publication method
- New crawler targets
- Setting a source `enabled=true`
- Using sources with unresolved robots / ToS / allowed-use status
- External APIs
- Paid services
- Paid external APIs, metered billing APIs, API keys, secrets, or billing accounts
- DB / auth
- Source policy changes that allow external article body or image storage
- Large workflow, generator, or publishing-path changes
