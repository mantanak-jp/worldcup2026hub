# Source Registry Specification

The source registry defines which sites or feeds may be used by the crawler and how they may be used.

No crawler target should be enabled until robots.txt, terms of service, and allowed use have been reviewed.

## Fields

- `id`: stable source identifier.
- `name`: human-readable source name.
- `base_url`: source home URL.
- `languages`: list of expected languages.
- `country_or_region`: primary country or region.
- `source_category`: source role.
- `crawl_method`: discovery or fetch method.
- `discovery_methods`: list of discovery approaches.
- `access_type`: public, paywalled, API, manual, or disabled.
- `robots_policy_status`: review status for robots.txt and site rules.
- `allowed_use`: allowed repository use.
- `priority`: crawl and review priority.
- `enabled`: whether scheduled crawling may use this source.
- `notes`: concise operational notes.

## Source Categories

- `tactical_analysis`
- `match_report`
- `official`
- `statistics`
- `manager_comment`
- `player_comment`
- `preview`
- `longform_analysis`
- `video_analysis`

## Crawl Methods

- `rss`
- `sitemap`
- `site_search`
- `search_api`
- `custom_fetcher`
- `disabled`

## Enablement Rule

`enabled=true` requires all of the following:

- robots.txt reviewed
- terms of service reviewed
- allowed use reviewed
- no unresolved copyright or redistribution concern
- no requirement to store external article body text or external images

If any item is unknown, the source must remain `enabled=false`.

After a source is reviewed, approved, and set to `enabled=true`, scheduled crawling may use it automatically without per-run confirmation.

## Allowed Use Values

- `metadata-and-link-only`
- `metadata-link-and-short-original-notes`
- `blocked`
- `manual-review-needed`

The default should be `manual-review-needed`.
