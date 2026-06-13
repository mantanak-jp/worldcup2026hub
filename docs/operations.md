# Operations Notes

This document tracks repository and workflow notes for maintainers.

## Branching

The repository currently uses `main` as the primary branch.

For initial documentation setup in this new repository, direct commits to `main` are acceptable. As implementation work grows, use feature branches and pull requests for review.

## Local Setup

Recommended repository refresh flow:

```powershell
git fetch origin --prune
git checkout -B main origin/main
git pull --ff-only origin main
```

## Local Files

Local Codex workspace metadata is not part of the repository and should remain untracked.

## Local Level 3 Pipeline

Use the one-command local quality gate before opening Level 3 review pipeline PRs:

```powershell
node tools/run_local_level3_pipeline.js --check-only
```

The command runs article/extraction validation, tactical claim validation, review outline generation, outline validation, generated Japanese review generation, generated review validation, and deterministic output checks. It stops at the first failed stage, prints the failed stage and reason, and exits non-zero. `--write` may be used on a feature branch to replace generated outline/review JSON after the generated output parses and matches the deterministic tool output.

Negative fixtures are available with:

```powershell
node tools/run_local_level3_pipeline.js --self-test-negative
```

This path is dry-run only. It does not crawl, scrape, deploy Pages, call external APIs, read secrets, write back to main, or store external article bodies, translated bodies, long quotations, or external images.
