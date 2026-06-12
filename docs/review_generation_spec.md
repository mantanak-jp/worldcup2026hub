# Review Generation Specification

Generated match reviews are original Japanese reviews based on multiple source articles and structured match data.

They are not translations, copied summaries, or link collections.

## Review Goals

Each generated review should:

- Explain the match flow
- Identify initial tactical shapes
- Highlight key tactical themes
- Describe turning points
- Identify key players
- Explain substitutions and adjustments
- Separate source consensus from source disagreement
- Explain implications for the next match

## Required Links

Generated reviews should be linked to:

- `match_id`
- `source_ids`
- `article_ids`
- `generation_run_id`
- `version`

## Review Fields

- `title_ja`
- `short_summary_ja`
- `match_flow`
- `initial_shapes`
- `key_tactical_themes`
- `turning_points`
- `key_players`
- `substitutions_and_adjustments`
- `source_consensus`
- `source_disagreement`
- `next_match_implications`
- `source_coverage`
- `confidence`
- `generated_at`
- `version`
- `status`
- `source_ids`
- `article_ids`
- `generation_run_id`

## Status Values

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

## Auto Publication

`auto_published` reviews are allowed. Human review is not required for every generation run.

The UI should clearly display source coverage, confidence, generation version, generated time, and review status so readers can judge quality.

Manual review can be used for low-confidence, insufficient-source, or unresolved-policy reviews, but it is not a required gate for every generated review.

## Copyright Guardrails

Generated reviews must not include copied article bodies, long quotations, or external images.

They may cite source metadata and link to original sources. They should synthesize across sources in original Japanese prose.

Review generation in the current path must not use paid external APIs, metered billing APIs, API keys, secrets, or billing accounts.

Full external article text may be used as an input only in a future implementation where the source policy explicitly allows that use and the user has approved the source policy. Unreviewed sources default to metadata, URL, extraction notes, and generated review output only.
