# Future Crawler Plan

Automatic crawling is a later phase and must not be implemented without explicit user approval.

## Preconditions

- User approves crawling targets.
- Robots.txt and site terms are reviewed.
- Copyright and quotation boundaries are documented.
- Storage policy is limited to metadata, URLs, and concise original notes.
- Rate limits and retry behavior are defined.

## Non-Goals For Now

- No crawler implementation.
- No scheduled GitHub Actions.
- No external API integration.
- No copied article bodies.
- No external image storage.
- No database or authentication.

## Future Shape

Potential future crawler output should map into source metadata and update history records only.

```json
{
  "source_id": "source-example",
  "url": "https://example.com/article",
  "checked_at": "2026-06-12T00:00:00+09:00",
  "checked_status": "manual-review-needed",
  "related_match_ids": ["match-001"],
  "related_team_ids": [],
  "japanese_note": "短い独自メモのみ。本文コピーはしない。"
}
```

Crawler output should never store article body text or downloaded images.
