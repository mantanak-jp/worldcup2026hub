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

Article extractions are optional in local dry-runs until the scaffold lands, but when present they should improve article counts, language coverage, missing-input reporting, and claim linkage validation.

## Tactical Claim Contract

`data/tactical_claims.json` is the source-grounded claim layer between short extraction notes and review outlines.

Each tactical claim must include:

- `id`
- `match_id`
- `team_ids`
- `claim_type`
- `tactical_phase`
- `tactical_theme`
- `claim_text_ja`
- `supporting_extraction_ids`
- `supporting_article_ids`
- `supporting_source_ids`
- `opposing_extraction_ids`
- `opposing_article_ids`
- `opposing_source_ids`
- `confidence`
- `confidence_factors`
- `uncertainty`
- `disagreement_status`
- `missing_inputs`
- `duplicate_key`
- `generation_stability_key`
- `created_at`
- `updated_at`
- `status`

Claims must be grounded in at least one supporting extraction, article, and source. Claims without source, article, or extraction support are invalid.

`supporting_article_ids` and `supporting_source_ids` are derived from `supporting_extraction_ids` and must not include unrelated records. `opposing_article_ids` and `opposing_source_ids` are derived from `opposing_extraction_ids` or from opposing refs carried by supporting extractions. Supporting refs and opposing refs must remain separate so a disputed point is not rendered as consensus.

## Confidence Rules

Claim confidence is a local quality signal, not a guarantee of correctness. It should consider:

- Supporting source count
- Supporting article count
- Language diversity
- Source type diversity
- Approved or unapproved source policy
- Opposing evidence
- Average extraction confidence
- Metadata-only evidence
- Missing input count

Low-confidence sample claims may remain visible if status, uncertainty, source coverage, and missing inputs are explicit.

The local deterministic formula starts from `0.15`, then applies:

- `+0.08` for each supporting source, capped at 3 sources
- `+0.06` for each supporting article, capped at 3 articles
- `+0.05` for each supporting extraction, capped at 3 extractions
- `+0.03` for each supporting language, capped at 3 languages
- `+0.03` for each source type, capped at 3 source types
- `+0.08` if at least one supporting source has an approved or metadata-link-only source policy
- `-0.05` if no supporting source has that policy state
- `+0.20 * average supporting extraction confidence`
- `-0.08` for metadata-only evidence
- `-0.03` for each missing input, capped at 5 inputs
- `-0.08` when opposing evidence exists

The value is clamped to `0..1` and rounded to two decimals. `confidence_factors` must match the deterministic factors used for the calculation.

## Duplicate And Disagreement Handling

Claim normalization detects duplicates using a deterministic key:

```text
match_id|sorted team_ids|tactical_phase|tactical_theme|normalized claim_text_ja
```

The text normalization uses NFKC normalization, lower-casing, whitespace collapse, and punctuation removal. The stored `duplicate_key` must equal the computed key.

If a claim has opposing evidence, keep `opposing_*` references and set `disagreement_status` instead of presenting one side as settled. Do not infer consensus from thin source support.

## Compatibility

Older sample records used `team_id`, `phase`, `topic`, and `claim_ja`. New sample data should use `team_ids`, `tactical_phase`, `tactical_theme`, and `claim_text_ja`. Existing local generators keep read-only fallback support for `claim_ja` so older generated review fixtures do not break, but new claim records should not use legacy fields.

## Local Claim Normalizer

`tools/normalize_tactical_claims.js` validates tactical claims locally. It checks JSON root shape, required fields, allowed values, duplicate IDs, deterministic duplicate keys, confidence range, deterministic confidence factors, extraction/article/source consistency, match/team references, unsupported or ungrounded claims, prohibited content-like fields, and concise claim text length. It does not write files, access the network, run a crawler, call external APIs, or generate new unsupported claims.

The script exits non-zero on validation errors and prints a deterministic JSON summary. `--self-test-negative` runs local negative fixtures for duplicate IDs, missing extraction refs, missing source refs, ungrounded claims, confidence range failures, and prohibited content fields.

## Review Outline Contract

`data/review_outlines.json` aggregates validated claims by match. It must carry claim IDs, deterministic section buckets, source coverage, confidence factors, uncertainty, missing inputs, status, generation version, stability key, and timestamps.

Review outlines are responsible for sorting claims into sections and preserving disagreement. Generated reviews are responsible for turning those outline sections into short Japanese prose without adding new tactical assertions.

The outline section order is:

```text
match_flow
initial_shapes
in_possession
out_of_possession
transitions
adjustments
substitutions
turning_points
key_players
source_consensus
source_disagreement
limitations
```

Disagreement claims are routed to `disagreement_claim_ids` and should not be mixed into consensus. `consensus_claim_ids` requires stronger support than a single source.

`tools/normalize_review_outlines.js` validates root shape, duplicate IDs, match and claim refs, section refs, disagreement refs, deterministic source coverage, confidence factors, confidence, missing inputs, status, generation version, stability key, prohibited content-like fields, and negative fixtures.

## Japanese Review Generation

Generated Japanese review text must be derived from outline sections. It must not translate a single article, closely paraphrase external article text, infer coach intent without claim support, imply independent video analysis, or resolve source disagreement as if one side is proven.

Low-confidence and insufficient-source reviews should be short. Missing inputs flow into the `limitations` section. Empty sections remain empty.

## Review Requirements

- Claims must link to supporting source IDs and article IDs when available.
- Disputed claims should record opposing source IDs.
- Confidence and source coverage must be visible.
- Missing inputs should be explicit.
- `auto_published`, `low_confidence`, and `insufficient_sources` are valid statuses.

## Publication Rule

`auto_published` is allowed when the UI displays source coverage, confidence, generation version, generated time, and status.

Low-confidence or insufficient-source reviews may still be published if clearly labeled.
