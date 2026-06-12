# Development Workflow

WorldCup2026Hub uses a worktree-first workflow so Codex can advance independent work streams with minimal user back-and-forth.

## Source of Truth

`main` is the source-of-truth branch.

Code changes should be proposed through pull requests. Codex must not merge PRs unless the user explicitly approves the merge.

## Worktree-Based Feature Work

Feature work should normally happen in a dedicated worktree and branch.

Codex may create branches and worktrees, implement changes, run checks, commit, push, and create pull requests when the work is within the approved project boundaries.

Independent tasks may be developed in parallel. A typical aggressive wave may use five to eight active worktrees when the changes are separable.

## Parallel PR Train

When multiple PRs are opened together:

- Keep each PR focused on one purpose.
- Avoid touching shared files unless the value is clear.
- Mention PR dependencies and likely conflicts in the PR body.
- Prefer merging policy and data-model PRs before implementation PRs that consume those structures.
- Keep merge decisions with the user.

## Boundary Changes

Codex may proceed without extra confirmation for HTML, CSS, JavaScript, JSON sample data, docs, local-only scripts, checks, commits, pushes, and PR creation.

User confirmation is required for:

- Merge to `main`
- Paid external APIs, paid services, metered billing APIs, API keys, secrets, or billing accounts
- New crawler targets
- Setting any source target to `enabled=true`
- Using sources with unresolved robots, ToS, copyright, license, or allowed-use status
- Real crawler execution
- Initial GitHub Pages publication settings or a changed Pages publication method
- Pages deployment execution before the publishing path is approved
- DB, auth, or login
- Large technology stack changes
- Force push
- Branch, tag, or worktree deletion

## Content And Cost Guardrails

Paid external APIs are not part of the current implementation path.

The default source handling mode is metadata, URL, extraction notes, and generated review output. Full external article text or external images must not be persisted unless the source policy explicitly allows it and the user has approved that source policy.

## Completion Report

For each PR, report:

```text
Branch:
Worktree:
Commit:
Push:
PR:
Changed files:
Diff stat:
What was done:
What was not done:
Checks performed:
Dependency / merge order:
Next recommended step:
```
