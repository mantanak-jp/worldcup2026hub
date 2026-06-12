# AGENTS.md

## Project

WorldCup2026Hub is an automated multilingual match review generation platform for the 2026 FIFA World Cup.

The core product is not a manual link collection. The finished system should regularly collect official information, statistics, tactical analysis, match reports, manager comments, player comments, previews, and long-form reviews from approved multilingual sources, organize them by match and team, generate original Japanese match reviews, and publish updated site content automatically.

GitHub Pages is the display surface. The main system is the collection, normalization, review-generation, and publishing pipeline behind it.

## Development Roles

* User:

  * Gives instructions from iPhone.
  * Makes final decisions on merge, new crawler targets, robots / ToS risk, paid services, DB / auth introduction, and any storage of external article bodies or images.
* Codex:

  * Handles local repository work, worktree management, implementation, checks, commits, pushes, and PR creation when appropriate.
  * May implement approved automation architecture within the repository rules.
* ChatGPT:

  * Helps with planning, requirements, review, task prompts, and development guardrails.
* GitHub:

  * Source of truth for repository state, scheduled automation, generated artifacts, and Pages deployment state.

## Local Repository Layout

Normal repository:

```text
C:\Users\manta\dev\WorldCup2026Hub
```

Feature work should normally be done in worktrees.

## Git and Worktree Policy

* Treat `main` as the source-of-truth branch.
* Do not work directly on `main` unless the user explicitly says main direct commit is allowed.
* Prefer worktree + feature branch for implementation work.
* Keep changes small and reviewable.
* Codex may create branches and worktrees when needed.
* Codex may use multiple independent worktrees in parallel when tasks are separable.
* Codex may commit and push changes after checking the diff.
* Codex may create pull requests when appropriate.
* Codex should document PR dependencies and likely conflicts in PR bodies.
* Do not merge pull requests unless the user explicitly approves.
* Do not force push unless the user explicitly approves.
* Do not delete branches, tags, or worktrees unless the user explicitly approves.

## Automation Operating Model

GitHub Actions scheduled workflows, approved-source crawlers, review generators, generated data updates, site artifact generation, and GitHub Pages deployment are core features of the completed platform.

Code changes remain PR-based.

Routine tournament-operation updates may be automated after the relevant source registry, workflow, generator, and publishing path are approved and merged.

Once a source, workflow, generator, and publishing path are approved and merged, routine tournament-operation runs may update generated reviews, data files, site artifacts, and Pages output automatically without per-review user confirmation.

Human review is not required for every generated review. `auto_published` reviews are allowed when source coverage, confidence, generation version, and status are visible in the UI.

## Codex May Proceed Without Additional Confirmation For

* HTML / CSS / JavaScript implementation.
* JSON sample data creation.
* README updates.
* Small docs updates.
* UI layout improvements.
* Smartphone responsive layout improvements.
* Local checks.
* Git diff review.
* Commit.
* Push.
* Pull request creation.
* Source registry schema work.
* Crawler pipeline design work.
* Review generation design work.
* Static data model changes that do not enable new external targets.

## Codex May Implement After The Feature Is Requested

* GitHub Actions scheduled workflows for approved source crawling.
* Approved-source crawler implementation based on `source_registry`.
* Review generator implementation.
* Static export or site artifact generation.
* GitHub Pages deploy workflow.
* Automated updates to data, generated reviews, and site artifacts.

After these paths are approved and merged, routine scheduled runs do not require per-review confirmation.

## User Confirmation Required For Boundary Changes

* Merging into `main`.
* Adding a new crawler target.
* Enabling a source target.
* Using sources with unresolved robots / ToS / allowed-use status.
* Initial GitHub Pages publication settings.
* Changing the GitHub Pages publication method.
* Large workflow, generator, or publishing-path changes.
* External API usage.
* Paid services.
* Database introduction.
* Login / authentication.
* Admin UI.
* Storing external article bodies.
* Storing external images.
* Any implementation with unresolved copyright, terms-of-service, scraping, or redistribution risk.
* Large technology stack changes.
* Large file deletion or repository restructuring.
* Force push.
* Branch, tag, or worktree deletion.

## Copyright and Source Handling Guardrails

* Do not reproduce external article bodies.
* Do not store or redistribute external article images.
* Do not persist full external article text.
* Store source metadata, URL, language, source type, related match/team, checked status, extraction notes, and concise original Japanese notes.
* Generated Japanese reviews must be original synthesis, not translation, copied summary, or long quotation.
* Treat external sources as references, not copied content.
* Respect robots.txt, site terms, copyright, and fair use / quotation limits.
* Scheduled crawling of approved sources in the source registry is allowed.
* New crawler targets require user confirmation before being enabled.
* Approved source registry entries may be crawled on schedule without per-run confirmation.

## Technical Direction

* Keep the initial site GitHub Pages-compatible.
* Use plain HTML / CSS / JavaScript / JSON until a larger stack change is explicitly approved.
* Do not introduce package.json, Astro, build tools, database, or login until explicitly requested.
* Design should remain easy to migrate to Astro / MDX later.
* The final system should support scheduled collection, extraction, review generation, generated review versioning, confidence display, source coverage display, and automated publishing.

## Current MVP Direction

Build toward an automated match review platform with:

* Top page.
* Match list.
* Team list.
* Match detail pages.
* Team detail pages.
* Source registry.
* Crawl run history.
* Article metadata.
* Article extraction metadata.
* Generated match reviews.
* Review generation runs.
* Result report status.
* Tactical review status.
* Source coverage and confidence display.

## Required Pre-Work Checks

Before making changes, Codex should check:

```text
pwd
git branch --show-current
git status
git log --oneline -5
git worktree list
```

## Required Post-Work Checks

After making changes, Codex should check:

```text
git status
git diff --stat
git diff --name-only
```

If relevant, also perform a simple local display, syntax, or Markdown consistency check.

## Completion Report Format

When reporting completion, include:

```text
Branch:
Commit:
Push:
PR:
Changed files:
Diff stat:
What was done:
What was not done:
Next recommended step:
```

## Prohibited Without Explicit User Approval

* Merge to `main`.
* Force push.
* Delete branches.
* Delete worktrees.
* Delete tags.
* Enable initial GitHub Pages settings.
* Change GitHub Pages publication method.
* Add new crawler targets.
* Enable any source target without user approval.
* Use sources whose robots / ToS / allowed-use review is incomplete.
* Make large workflow, generator, or publishing-path changes.
* Add external APIs.
* Add paid services.
* Add DB / authentication.
* Store copied article text or external images.
* Large-scale rewrite or repository restructuring.
