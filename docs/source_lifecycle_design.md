# Source Lifecycle Design

This document defines the proposed lifecycle for discovering, reviewing, approving, operating, pausing, and retiring external sources in WorldCup2026Hub.

It is a design document only. It does not add a crawler target, approve a source, enable crawling, access a real site, or change runtime behavior.

## 1. Goals

The lifecycle must:

- keep unreviewed candidates outside the crawler's executable source set
- separate policy approval from runtime enablement
- preserve stable source IDs across review and operation
- record robots, terms, copyright, allowed-use, storage, and cost decisions
- support pause, re-review, retirement, and emergency disablement
- remain editable through a future administrator interface
- provide auditable state transitions
- prevent incomplete policy records from being used by automated review generation

## 2. Recommended Model

Use two logical datasets:

```text
source_candidates
  -> research and policy review records

source_registry
  -> approved operational source records
```

For the current static repository phase, the logical datasets should be represented by separate JSON files:

```text
data/source_candidates.json
data/source_registry.json
```

The future Firestore or hybrid runtime model may use separate collections with the same responsibilities.

### Why separation is recommended

The current single registry mixes:

- a real FIFA candidate
- placeholder example.com candidates
- policy fields
- crawler enablement fields
- review-pipeline source references

A separate candidate dataset makes the crawler trust boundary explicit. Candidate records can be incomplete and change frequently; operational registry records must satisfy a stricter contract.

### Stable ID rule

A source keeps the same `id` when promoted from candidate to registry.

Promotion moves or copies the approved operational projection while preserving:

- `id`
- discovery history
- policy evidence references
- decision history
- timestamps

The same `id` must not exist simultaneously as an active candidate and an active registry record. During a migration or promotion transaction, validators should detect ambiguous duplicates.

## 3. Lifecycle States

### 3.1 Candidate status

`candidate_status` values:

- `discovered`: recorded but not yet researched
- `researching`: source characteristics and access methods are being investigated
- `policy_review`: robots, terms, copyright, storage, and allowed-use review is in progress
- `ready_for_decision`: required evidence is present and a decision can be made
- `approved_for_registry`: approved for promotion, but not yet promoted
- `rejected`: not suitable for use
- `on_hold`: review is paused because evidence or operational need is insufficient
- `superseded`: replaced by another candidate record or source

Candidate status does not authorize crawling.

### 3.2 Registry approval status

`approval_status` values:

- `approved_metadata_only`
- `approved_metadata_and_short_notes`
- `approved_for_review_generation`
- `re_review_required`
- `suspended_policy`
- `retired`

Registry approval describes what use is permitted. It does not mean the crawler is currently active.

### 3.3 Runtime status

Use a separate `runtime_status` instead of relying only on a boolean:

- `disabled`
- `enabled`
- `paused`
- `error_hold`
- `emergency_disabled`
- `retired`

Keep a derived or compatibility `enabled` boolean during migration:

```text
enabled = runtime_status == "enabled"
```

The boolean must not be the primary lifecycle state after migration.

## 4. State Transitions

### 4.1 Candidate transitions

```text
discovered
  -> researching
  -> policy_review
  -> ready_for_decision
  -> approved_for_registry
  -> promoted to source_registry
```

Alternative outcomes:

```text
researching or policy_review
  -> on_hold
  -> researching

ready_for_decision
  -> rejected

any non-promoted state
  -> superseded
```

### 4.2 Registry transitions

Initial promotion:

```text
approved_for_registry
  -> registry approval_status
  -> runtime_status=disabled
```

Enablement is a separate explicit boundary change:

```text
runtime_status=disabled
  -> user approval
  -> runtime_status=enabled
```

Operational transitions:

```text
enabled -> paused -> enabled
enabled -> error_hold -> disabled or enabled
enabled -> emergency_disabled -> disabled
disabled -> re_review_required
re_review_required -> approved_* or suspended_policy
approved_* -> retired
```

A retired source must not return directly to enabled. Reintroduction requires a new review decision.

## 5. Required Candidate Fields

Candidate records should contain:

- `id`
- `name`
- `base_url`
- `languages`
- `country_or_region`
- `source_category`
- `candidate_status`
- `discovery_methods`
- `discovered_at`
- `discovered_by`
- `research_notes`
- `robots_policy_status`
- `terms_policy_status`
- `copyright_review_status`
- `allowed_use_status`
- `content_storage_policy_status`
- `paid_access_status`
- `policy_evidence`
- `decision_notes`
- `created_at`
- `updated_at`

`policy_evidence` should be an array of structured references:

```json
{
  "evidence_type": "robots|terms|copyright|access|other",
  "url": "https://...",
  "checked_at": "ISO-8601",
  "checked_by": "administrator-id",
  "note": "concise original note"
}
```

Candidate records must not contain live credentials, article bodies, copied terms text, or external images.

## 6. Required Registry Fields

Operational registry records should contain:

- identity and classification fields
- approved discovery and crawl methods
- reviewed policy fields
- `approval_status`
- `allowed_use`
- `content_storage_policy`
- `full_text_storage_allowed=false` by default
- `external_image_storage_allowed=false` by default
- `paid_api_required=false` in the current path
- `api_cost_policy`
- `runtime_status`
- compatibility `enabled`
- `priority`
- rate-limit and user-agent policy references
- `approved_at`
- `approved_by`
- `last_policy_reviewed_at`
- `next_policy_review_at`
- `runtime_status_reason`
- `created_at`
- `updated_at`

Only registry records may be eligible for scheduled crawling.

## 7. Promotion Gate

Promotion from candidate to registry requires all of the following:

- stable ID and canonical base URL
- source categories and languages confirmed
- robots review completed
- terms review completed
- copyright and redistribution risk reviewed
- allowed use explicitly selected
- content storage policy explicitly selected
- full-text and image storage default to false unless separately approved
- paid API and secret requirements resolved
- approved discovery or access method selected
- evidence and review timestamps present
- administrator decision recorded

Promotion does not enable crawling. New registry entries must start with:

```json
{
  "runtime_status": "disabled",
  "enabled": false
}
```

## 8. Enablement Gate

Changing runtime status to `enabled` requires:

- registry approval is active and not expired
- no `re_review_required`, `suspended_policy`, or `retired` status
- approved crawl method
- rate-limit policy
- user-agent policy
- parser or fixture validation completed
- kill-switch support
- explicit user approval for the new crawler target

## 9. Re-review Triggers

A source should move to `re_review_required` or `suspended_policy` when:

- robots.txt changes materially
- terms or access restrictions change
- paywall or authentication requirements change
- source ownership changes
- crawler behavior causes blocking or complaints
- stored or extracted data exceeds approved use
- parser changes require broader access
- policy evidence becomes stale
- administrator requests review

Re-review should disable runtime use unless a documented grace policy is later approved.

## 10. Audit Events

Record at least:

- candidate creation and editing
- evidence addition
- candidate decision
- registry promotion
- approval-status change
- runtime enable, pause, disable, emergency disable
- re-review request and decision
- retirement

Each event should include:

- event ID
- source ID
- action
- previous state
- new state
- actor
- timestamp
- reason

The initial static implementation may record audit events in reviewed JSON or update history. The runtime implementation may later use Firestore.

## 11. Crawler Trust Rule

The crawler must read only `source_registry` records that satisfy all of the following:

```text
approval_status is an active approved value
runtime_status == enabled
enabled == true
required policy reviews are complete
approved crawl method is present
```

`source_candidates` must never be part of the executable crawler input.

Review-generation validators may resolve historical source IDs from either display sources or registry records during migration, but candidate-only policy must not count as approved source coverage.

## 12. Administrator Interface Implications

The future administrator UI should expose separate areas for:

- candidate inbox and research
- policy evidence and decision
- registry operation
- runtime status and emergency controls
- audit history

Approval and enablement must be separate actions with separate confirmation steps.

## 13. Migration Direction

The current `data/source_registry.json` should not be edited in this design PR.

Recommended later migration:

1. create and validate `data/source_candidates.json`
2. move the six current candidate records into it
3. keep fixture IDs stable
4. leave `data/source_registry.json` empty or containing only genuinely approved operational records
5. update article and review fixtures so candidate-only IDs do not count as approved policy
6. add validators for candidate, registry, duplicate IDs, promotion gates, and runtime gates
7. migrate one real source only after policy review and explicit user approval

## 14. Decision Summary

Recommended decisions for Step 11-D:

- separate candidate and operational datasets
- preserve source IDs across promotion
- separate `candidate_status`, `approval_status`, and `runtime_status`
- retain `enabled` temporarily as a compatibility field
- start every promoted source disabled
- make policy evidence and audit transitions structured
- prohibit candidate records from crawler execution and approved-coverage calculations
