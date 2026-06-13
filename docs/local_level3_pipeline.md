# Local Level 3 Pipeline

This document describes the local-only Wave 3 quality gate for Level 3 source-based tactical reviews.

## Flow

```text
articles
  -> article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
  -> static site display
```

The pipeline is sample / dry-run only. It does not crawl, scrape, call external APIs, use paid APIs, read secrets, deploy Pages, commit generated files back to main, or store external article bodies, translated article bodies, long quotations, or external images.

## Command

```powershell
node tools/run_local_level3_pipeline.js --check-only
```

`--check-only` validates that saved JSON already matches deterministic generator output. It is the intended CI and local verification mode.

`--write` may be used on a feature branch to regenerate `data/review_outlines.json` and `data/generated_match_reviews.json` from local inputs. The command writes only after generated JSON parses and the generator output is stable across two runs.

`--self-test-negative` runs local negative fixtures for invalid refs, ungrounded claims, prohibited fields, confidence and coverage mismatches, and nondeterministic output detection.

## Stages

1. `tools/validate_source_contracts.js`
   - Input: `data/source_candidates.json`, `data/source_registry.json`.
   - Output: validation summary only.
2. `tools/normalize_article_extractions.js`
   - Input: `data/articles.json`, `data/article_extractions.json`, source/match/team refs.
   - Output: validation summary only.
3. `tools/normalize_tactical_claims.js`
   - Input: `data/tactical_claims.json` and extraction/article/source refs.
   - Output: validation summary only.
4. `tools/generate_review_outline_sample.js`
   - Input: validated tactical claims.
   - Output: deterministic review outline JSON.
5. `tools/normalize_review_outlines.js`
   - Input: saved `data/review_outlines.json`.
   - Output: validation summary only.
6. `tools/generate_structured_review_sample.js`
   - Input: saved review outlines.
   - Output: deterministic generated Japanese review JSON.
7. `tools/normalize_generated_match_reviews.js`
   - Input: saved `data/generated_match_reviews.json`.
   - Output: validation summary only.

## Quality Gates

The pipeline stops and exits non-zero when any of these conditions occur:

- Invalid source candidate or source registry contract.
- Invalid article or extraction contract.
- Invalid tactical claim contract.
- Ungrounded claim.
- Broken extraction, article, source, match, team, outline, or claim reference.
- Generated outline differs from deterministic output.
- Generated review differs from deterministic output.
- Confidence or source coverage mismatch.
- Unsupported text-like content storage field.
- Section body exists without supporting claims.
- Nondeterministic generator output.
- A sample with insufficient or unapproved source policy is marked `auto_published`.

Partial success is not success. Later stages do not run after a failed stage.

## Static Site Display

`detail.js` renders generated reviews from the outline-derived contract. The match detail page shows:

- Original Japanese generated review text.
- Review status and user-facing status explanation.
- Source coverage, confidence, source/article/extraction counts, languages, source types, generation version, and generated time.
- Missing inputs, uncertainty, and source disagreement.
- Source list from both display sources and source registry candidates.
- Explicit sample / dry-run labeling.

Empty sections remain hidden unless the review has no usable generated content, in which case the UI says the information is insufficient.

## Production Difference

Production still needs approved crawler sources, source policy review, real ingestion, real extraction workflow, editorial review rules, deployment automation approval, and tournament-operation monitoring. Wave 3 only proves the local data contract, deterministic generation, validation, and static display path.
