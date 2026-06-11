# AGENTS.md

## Project

WorldCup2026Hub is a personal information hub for the 2026 FIFA World Cup.

The goal is to build a GitHub Pages site that organizes match information, team information, result reports, tactical reviews, and references to external sources.

This is not intended to be a public media site. It is primarily a personal research and viewing hub.

## Development Roles

* User:

  * Gives instructions from iPhone.
  * Makes final decisions on merge, public settings, external APIs, crawling targets, and paid services.
* Codex:

  * Handles local repository work, worktree management, implementation, tests/checks, commits, pushes, and PR creation when appropriate.
* ChatGPT:

  * Helps with planning, requirements, review, task prompts, and development guardrails.
* GitHub:

  * Source of truth for repository state.

## Local Repository Layout

Normal repository:

```text
C:\Users\manta\dev\WorldCup2026Hub
```

Current worktree:

```text
C:\Users\manta\dev\worldcup2026hub-static-site-mvp
```

Main repository is used as the source-of-truth checkout.
Feature work should normally be done in worktrees.

## Git and Worktree Policy

* Treat `main` as the source-of-truth branch.
* Do not work directly on `main` unless the user explicitly says main direct commit is allowed.
* Prefer worktree + feature branch for implementation work.
* Keep changes small and reviewable.
* Codex may create branches and worktrees when needed.
* Codex may commit and push changes after checking the diff.
* Codex may create pull requests when appropriate.
* Do not merge pull requests unless the user explicitly approves.
* Do not force push unless the user explicitly approves.
* Do not delete branches, tags, or worktrees unless the user explicitly approves.

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

## User Confirmation Required For

* Merging into `main`.
* GitHub Pages publication settings.
* GitHub Actions scheduled execution.
* External API usage.
* Paid services.
* Database introduction.
* Login / authentication.
* Admin UI.
* Adding crawling targets.
* Storing external article bodies.
* Storing external images.
* Any implementation with copyright, terms-of-service, or scraping risk.
* Large technology stack changes.
* Large file deletion or repository restructuring.
* Force push.
* Branch, tag, or worktree deletion.

## Copyright and Source Handling Guardrails

* Do not reproduce external article bodies.
* Do not store or redistribute external article images.
* Store external sources as metadata, URL, source name, language, article type, related match/team, checked status, and Japanese summary notes.
* Keep Japanese notes concise and original.
* Treat external sources as references, not copied content.
* Respect robots.txt, site terms, copyright, and fair use / quotation limits.
* Crawling implementation must not be added without explicit user confirmation.

## Initial Technical Direction

* Start with a static GitHub Pages-compatible site.
* Use plain HTML / CSS / JavaScript at first unless otherwise instructed.
* Use JSON files for initial sample data.
* Do not introduce Astro, package.json, build tools, GitHub Actions, database, or login until explicitly requested.
* Design should remain easy to migrate to Astro / MDX later.

## Current MVP Direction

Build a minimal static site with:

* Top page.
* Match list.
* Team list.
* Match cards.
* Result report status.
* Tactical review status.
* Reference source display area in later phases.
* JSON-based data structure.

Automatic crawling is a later phase.

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

If relevant, also perform a simple local display or syntax check.

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
* Enable or change GitHub Pages settings.
* Add scheduled GitHub Actions.
* Add external APIs.
* Add paid services.
* Add DB / authentication.
* Add crawler targets.
* Store copied article text or external images.
* Large-scale rewrite or repository restructuring.
