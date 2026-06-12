# Article Extraction Specification

Article records are the metadata-only input layer for source-based review generation.

`data/articles.json` must not store external article bodies, long quotations, or external images. It stores source IDs, URLs, titles, language, source categories, related match/team IDs, timestamps, extraction status, and content storage policy.

`data/article_extractions.json` stores short original Japanese extraction notes and topic tags derived from article metadata or approved extraction outputs. These records are not copied article text.

## Role In The Pipeline

```text
articles
  -> article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
```

Article extractions connect article metadata to tactical claims and review outlines. They should make missing inputs explicit so generated reviews can show source coverage and confidence honestly.

## Guardrails

- No paid API, external API, secrets, or network access is required for this scaffold.
- Full text storage requires explicit source-policy approval and user confirmation.
- Unapproved sources must remain metadata-only or manual-review-needed.
- Extraction notes must be concise, original Japanese notes, not copied paragraphs.
- Long quotations and external image storage are out of scope.

## Minimum Fields

`articles.json` records should include `id`, `source_id`, `url`, `title`, `language`, `source_category`, `related_match_ids`, `related_team_ids`, timestamps, `extraction_status`, `content_storage_policy`, `full_text_stored`, and `notes`.

`article_extractions.json` records should include `id`, `article_id`, `match_id`, `team_ids`, `language`, `extraction_method`, `extracted_topics`, `tactical_phases`, `short_notes_ja`, `linked_claim_ids`, `confidence`, `missing_inputs`, `created_at`, and `notes`.
