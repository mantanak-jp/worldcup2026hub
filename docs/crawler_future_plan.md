# Crawler Future Plan

The crawler is a core staged feature of the completed WorldCup2026Hub platform, not an optional future add-on.

This PR does not implement the crawler. It defines the direction: source registry first, policy checks first, then staged crawler and generator implementation.

## Direction

- Build a source registry before enabling scheduled crawling.
- Define robots / ToS / allowed-use status for every source.
- Keep `enabled=false` until a source is reviewed.
- Use approved sources for scheduled crawling during normal operation.
- Store article metadata and extraction notes, not full external article bodies.
- Never store downloaded external images.
- Connect crawl output to generated match reviews.
- Trigger review regeneration when source coverage improves.

## Staged Implementation

1. Define source registry schema.
2. Add candidate sources with `enabled=false`.
3. Review robots.txt, terms, and allowed use.
4. Enable approved sources only after user confirmation.
5. Implement scheduled discovery.
6. Implement match-window crawl priority.
7. Implement extraction metadata.
8. Implement generated review runs.
9. Automate site artifact updates and Pages deployment.

## User Confirmation Required

User confirmation is required before:

- Adding a new crawler target.
- Setting `enabled=true` for a source.
- Using a source with unresolved robots / ToS / allowed-use status.
- Using external APIs.
- Adding paid services.
- Persisting anything beyond metadata, links, extraction notes, and original generated reviews.

After a source is approved and enabled, scheduled crawling of that source may run automatically without per-run confirmation.

## Storage Policy

Allowed:

- URL
- source ID
- title metadata
- published/discovered timestamps
- language
- source category
- related match/team IDs
- extraction status
- concise original Japanese notes
- generated Japanese review text

Not allowed:

- Full external article bodies
- Downloaded external images
- Long quotations
- Paywalled text extraction unless explicitly approved
