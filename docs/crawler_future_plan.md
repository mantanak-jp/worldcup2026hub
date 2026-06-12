# Crawler Future Plan

The crawler is a core staged feature of the completed WorldCup2026Hub platform, not an optional future add-on.

This PR does not implement the crawler. It defines the direction: source registry first, policy checks first, then staged crawler and generator implementation.

## Direction

- Build a source registry before enabling scheduled crawling.
- Define robots / ToS / allowed-use status for every source.
- Keep `enabled=false` until a source is reviewed.
- Use approved sources for scheduled crawling during normal operation.
- Default to article metadata, URLs, extraction notes, and generated reviews.
- Do not store full external article bodies unless the source policy explicitly allows it and the user has approved that source policy.
- Do not store external images unless the source policy explicitly allows it and the user has approved that source policy.
- Do not use paid external APIs, metered billing APIs, API keys, secrets, or billing accounts in the current implementation path.
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
- Adding paid external APIs, metered billing APIs, API keys, secrets, or billing accounts.
- Approving a source policy that permits full external article text or external image storage.

After a source is approved and enabled, scheduled crawling of that source may run automatically without per-run confirmation.

## Storage Policy

Default allowed:

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

Allowed only after explicit source-policy approval:

- Full external article bodies
- Downloaded external images

Not allowed:

- Long quotations
- Paywalled text extraction unless explicitly approved
