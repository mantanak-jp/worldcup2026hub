# Update Flow

This document defines the manual-first update flow for result reports, tactical reviews, and source status.

## Result Report Flow

1. Create or locate a match record.
2. Add source metadata as links only.
3. Mark result report status as `not_started`, `draft`, `review_needed`, or `published`.
4. Write a concise original Japanese summary when ready.
5. Record the update in update history.

## Tactical Review Flow

1. Link the review to a match ID.
2. Track review status separately from result report status.
3. Add themes, formation notes, and turning points as original notes.
4. Link references as metadata only.
5. Record the update in update history.

## Update History Fields

Recommended fields:

```json
{
  "id": "update-001",
  "target_type": "match",
  "target_id": "match-001",
  "status": "draft",
  "summary": "Initial match shell prepared.",
  "updated_by": "codex",
  "updated_at": "2026-06-12T00:00:00+09:00",
  "source_ids": []
}
```

## Status Values

- `not_started`
- `draft`
- `review_needed`
- `published`
- `blocked`

Use explicit statuses so unfinished work is visible in the static UI.
