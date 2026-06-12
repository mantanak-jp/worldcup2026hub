# Level 3 Tactical Review Specification

WorldCup2026Hub targets Level 3: source-based structured tactical review.

Level 3 means the platform organizes tactical claims confirmed by multiple sources and turns them into readable Japanese reviews covering match flow, initial shapes, tactical themes, adjustments, key players, and source agreement or disagreement.

## Non-Goals

- Do not infer formations from video independently.
- Do not invent tactical claims that are absent from sources.
- Do not infer manager intent without source support.
- Do not target Level 4 human-writer-grade review quality in this wave.
- Do not use paid external APIs.
- Do not add secrets.
- Do not run real crawling.

## Data Flow

```text
article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
```

## Review Requirements

- Claims must link to supporting source IDs and article IDs when available.
- Disputed claims should record opposing source IDs.
- Confidence and source coverage must be visible.
- Missing inputs should be explicit.
- `auto_published`, `low_confidence`, and `insufficient_sources` are valid statuses.

## Publication Rule

`auto_published` is allowed when the UI displays source coverage, confidence, generation version, generated time, and status.

Low-confidence or insufficient-source reviews may still be published if clearly labeled.
