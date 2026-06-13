# Article Extraction Specification

Article and extraction records are the contract between source discovery and Level 3 source-based tactical review generation.

This layer must let WorldCup2026Hub answer three questions without storing article bodies:

- Which source article is this metadata about?
- Which match, teams, topics, tactical phases, players, managers, and claims does it support?
- What is still uncertain, disputed, or missing before a generated Japanese review can be trusted?

The layer is intentionally separate from crawler implementation. It can be populated by sample data, manual metadata, future approved crawlers, or future approved extraction tools, but it must remain valid without running a real crawler.

## Responsibilities

### `data/articles.json`

`articles.json` is the metadata-only article registry. It records stable article identity, source identity, URL metadata, relation to matches and teams, timing, policy state, duplicate-detection hints, and extraction status.

It must not store article body text, translated article text, long quotations, external images, scraped HTML, or raw page dumps.

### `data/article_extractions.json`

`article_extractions.json` is the short original extraction-note layer. It records concise Japanese notes and structured tags derived from article metadata or approved extraction outputs.

Extraction notes are not copied article text. They should be short, original Japanese observations that preserve enough meaning for claim linking while avoiding close paraphrase, translation, or long quotation.

## Data Flow

```text
articles
  -> article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
```

Article extractions bridge article metadata to `tactical_claims`. They should carry source/article IDs, uncertainty, disagreement, confidence, and missing inputs forward so generated reviews can display source coverage honestly.

## `articles.json` Contract

Required fields:

- `id`: stable unique article ID.
- `source_id`: ID from `data/sources.json` or `data/source_registry.json`.
- `url`: original article URL.
- `canonical_url`: normalized canonical URL used for duplicate detection.
- `title`: article title metadata.
- `language`: BCP-47-like language code such as `ja`, `en`, `es`, or `fr`.
- `source_category`: array of source categories from the source registry taxonomy.
- `article_type`: article-level type such as `match_report`, `tactical_analysis`, `statistics`, `official`, `manager_comment`, `player_comment`, `preview`, `longform_analysis`, or `video_analysis`.
- `related_match_ids`: match IDs linked to this article.
- `related_team_ids`: team IDs linked to this article.
- `published_at`: publication timestamp if known; `null` is allowed for samples or unknown metadata.
- `discovered_at`: time this metadata record was discovered or created.
- `checked_at`: time this metadata record was last policy/schema checked.
- `updated_at`: time this metadata record was last updated.
- `extraction_status`: status for extraction readiness.
- `content_storage_policy`: current content storage policy.
- `full_text_stored`: must be `false` in the current implementation.
- `duplicate_key`: deterministic key for duplicate detection.
- `notes`: short operational note.

Optional fields:

- `author_names`: array of author names when available as metadata.
- `publisher_name`: publisher metadata if different from source name.
- `headline_hash`: deterministic hash-like placeholder for duplicate detection.
- `url_hash`: deterministic hash-like placeholder for duplicate detection.
- `policy_review_status`: source/article policy status.
- `discovered_by`: `manual_sample`, `dry_run`, `future_crawler`, or similar provenance.
- `generation_stability_key`: stable key used to avoid unnecessary regeneration churn.

## `article_extractions.json` Contract

Required fields:

- `id`: stable unique extraction ID.
- `article_id`: referenced article ID.
- `source_id`: must match the referenced article's `source_id`.
- `match_id`: referenced match ID.
- `team_ids`: referenced team IDs.
- `language`: source article language.
- `article_type`: article-level type inherited from the article record.
- `extraction_method`: provenance such as `manual_sample_metadata_only` or `manual_sample_short_note`.
- `extraction_status`: extraction status.
- `extracted_topics`: structured topic tags.
- `tactical_phases`: Level 3 tactical phase tags.
- `tactical_themes`: reader-facing or generator-facing tactical theme tags.
- `short_notes_ja`: concise original Japanese extraction note.
- `linked_claim_ids`: tactical claim IDs supported by this extraction.
- `supporting_source_ids`: source IDs that support this extraction.
- `supporting_article_ids`: article IDs that support this extraction.
- `opposing_source_ids`: source IDs that disagree or offer a competing view.
- `opposing_article_ids`: article IDs that disagree or offer a competing view.
- `confidence`: number from 0 to 1.
- `uncertainty`: short uncertainty label or note.
- `disagreement_notes_ja`: concise original Japanese note for source disagreement; empty string is allowed.
- `missing_inputs`: inputs still needed before stronger review generation.
- `evidence_metadata`: structured metadata about what kind of evidence is available.
- `created_at`: creation timestamp.
- `updated_at`: update timestamp.
- `notes`: short operational note.

Optional fields:

- `named_players`: player names mentioned as metadata or extraction tags.
- `named_managers`: manager names mentioned as metadata or extraction tags.
- `event_refs`: match event IDs when future structured event data exists.
- `generation_stability_key`: stable key used to avoid unnecessary regeneration churn.

## Allowed Content

Allowed:

- Article URL and canonical URL.
- Article title metadata.
- Source ID, source category, article type, language, and timestamps.
- Author/publisher metadata when available.
- Short original Japanese extraction notes.
- Topic, phase, player, manager, and claim-linking tags.
- Confidence, uncertainty, disagreement, and missing-input metadata.

Not allowed:

- Full external article body text.
- Translated article body text.
- Long quotations.
- Close paraphrases that reproduce article structure or wording.
- External images, image binaries, screenshots, or raw HTML.
- Raw crawler output.
- Speculative tactical claims not supported by source/extraction records.
- Independent video analysis conclusions.

## Uncertainty And Disagreement

If sources are thin, conflicting, or policy review is incomplete, records should carry that state instead of smoothing it over.

- Use `missing_inputs` for absent source policy, second-source confirmation, event data, post-match metadata, or article-level evidence.
- Use `uncertainty` for short labels such as `sample_only`, `single_source`, `policy_unreviewed`, or `needs_event_data`.
- Use `opposing_source_ids`, `opposing_article_ids`, and `disagreement_notes_ja` when a competing source view exists.
- Do not invent a consensus when source support is insufficient.

## Validator Responsibilities

`tools/normalize_article_extractions.js` is a local-only validation tool.

It must:

- Read local JSON only.
- Tolerate missing `data/articles.json` and `data/article_extractions.json`.
- Validate array root shapes.
- Detect duplicate article and extraction IDs.
- Validate article `source_id` references against `data/sources.json` and `data/source_registry.json`.
- Validate article match/team references.
- Validate extraction `article_id`, `source_id`, match/team, supporting source/article, opposing source/article, and linked claim references.
- Check required fields.
- Check allowed values for language, status, policy, article type, and tactical phase fields.
- Flag suspicious body-storage fields such as `body`, `content`, `html`, `raw_html`, `full_text`, `translation`, `image`, or `images`.
- Flag `full_text_stored=true`.
- Require `missing_inputs` to be an array.
- Produce deterministic JSON output.
- Avoid writing files, accessing the network, calling external APIs, reading secrets, running crawlers, or storing article bodies/images.

The validator is not a claim generator. It does not create tactical claims, infer formations, infer manager intent, or improve review prose.

`tools/validate_source_contracts.js` runs before article/extraction validation in the local pipeline. Candidate-only sources may be referenced during fixture migration, but candidate records do not count as approved source coverage and must not be used as crawler input. A later compatibility PR will update review pipeline approval logic so candidate-only policy cannot be mistaken for approved operational coverage.

## Current Sample Scope

Current records are sample / dry-run data only.

- Source targets remain disabled.
- Real crawling is not running.
- External API and paid API usage is not introduced.
- Full text storage is not implemented.
- Sample extraction notes are short original Japanese notes, not copied or translated article bodies.
