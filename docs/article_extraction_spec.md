# Article Extraction Specification

Article records are the metadata-only input layer for source-based review generation.

`data/articles.json` must not store external article bodies, long quotations, or external images. It stores source IDs, URLs, titles, language, source categories, related match/team IDs, timestamps, extraction status, and content storage policy.

`data/article_extractions.json` stores short original Japanese extraction notes and topic tags derived from article metadata or approved extraction outputs. These records are not copied article text.

## Pipeline Flow

```text
articles
  -> article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
```

Article extractions connect article metadata to tactical claims and review outlines. They should make missing inputs explicit so generated reviews can show source coverage and confidence honestly.

## Local Normalizer

`tools/normalize_article_extractions.js` is a local-only validation tool.

It reads local JSON files and prints a validation summary for article counts, extraction counts, linked matches, linked claims, missing references, and confidence. It does not write files, access the network, call external APIs, use paid services, read secrets, store article bodies, or store external images.

The normalizer is not a claim generator and it does not infer tactical points. It validates relationships that already exist in local metadata and extraction records.

The script is intentionally tolerant of missing `data/articles.json` and `data/article_extractions.json`, so it can run before or after scaffold data is merged.

## Guardrails

- No paid API, external API, secrets, or network access is required for this scaffold or the local normalizer.
- Full text storage requires explicit source-policy approval and user confirmation.
- Unapproved sources must remain metadata-only or manual-review-needed.
- Extraction notes must be concise, original Japanese notes, not copied paragraphs.
- Long quotations and external image storage are out of scope.
- Local validation must not create tactical claims or infer coach intent.

## Minimum Fields

`articles.json` records should include `id`, `source_id`, `url`, `title`, `language`, `source_category`, `related_match_ids`, `related_team_ids`, timestamps, `extraction_status`, `content_storage_policy`, `full_text_stored`, and `notes`.

`article_extractions.json` records should include `id`, `article_id`, `match_id`, `team_ids`, `language`, `extraction_method`, `extracted_topics`, `tactical_phases`, `short_notes_ja`, `linked_claim_ids`, `confidence`, `missing_inputs`, `created_at`, and `notes`.
