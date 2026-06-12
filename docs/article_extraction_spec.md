# Article Extraction Specification

Article extraction is the local validation layer between article metadata and source-based tactical claims.

`tools/normalize_article_extractions.js` reads local JSON files and prints a validation summary. It does not write files, access the network, call external APIs, use paid services, read secrets, store article bodies, or store external images.

The script is intentionally tolerant of missing `data/articles.json` and `data/article_extractions.json` so it can run before the scaffold PR is merged.

## Expected Flow

```text
articles
  -> article_extractions
  -> tactical_claims
  -> review_outlines
  -> generated_match_reviews
```

The normalizer validates references and summarizes confidence; it does not generate new claims or infer tactical points that are not present in local data.
