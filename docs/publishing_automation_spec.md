# Publishing Automation Specification

WorldCup2026Hub is intended to publish generated match review updates automatically during tournament operation.

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
- Sources with unresolved policy status
- Major generation-prompt changes
- Copyright or terms-of-service risk
