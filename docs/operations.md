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
