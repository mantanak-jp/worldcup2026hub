# v0.1 Release Checklist

Use this checklist before and after initial GitHub Pages publication for WorldCup2026Hub.

## Repository State

- `main` is clean.
- `git pull --ff-only` has completed.
- Latest merged PRs are reflected in local `main`.
- No feature branch is merged without user approval.

## Local Validation

- JSON parse check passes for all `data/*.json`.
- `node --check app.js` passes.
- `node --check detail.js` passes.
- `node --check tools/generate_match_review_sample.js` passes.
- `node --check tools/generate_structured_review_sample.js` passes.
- Local generators run successfully.
- Local extraction normalizer runs successfully when present.
- Daily workflow dry-run remains validation-only.

## Policy Boundaries

- No source registry entry has `enabled=true`.
- No `paid_api_required=true`.
- No `full_text_storage_allowed=true`.
- No secrets, API keys, billing accounts, DB, or auth are introduced.
- No real crawler has been executed.
- No Pages deploy has been executed.
- External article bodies and external images are not stored.

## Site Display

- `index.html` loads locally.
- `match.html?id=match-001` loads locally.
- `team.html?id=team-canada` loads locally.
- Unknown match and team IDs show fallbacks.
- Generated review UI shows status, source coverage, confidence, generation version, and generated time.
- The site clearly states that v0.1 uses sample and dry-run data.
- Mobile and desktop layouts pass a basic visual check.

## Publication Steps

- User confirms initial GitHub Pages publication settings.
- Pages URL is verified after publication: `https://mantanak-jp.github.io/worldcup2026hub/`.
- README `Published URL` is updated after the URL is known.
- Any future Pages deployment automation remains PR-based until the publishing path is approved.
