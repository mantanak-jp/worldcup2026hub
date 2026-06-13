# Source Contract Impact Analysis

This document identifies the repository changes required if WorldCup2026Hub separates source candidates from the approved operational source registry.

It is analysis only. No contract, data, runtime behavior, crawler target, source enablement, or external access is changed here.

## 1. Proposed Contract Change Under Analysis

Current model:

```text
data/source_registry.json
  contains candidate, fixture, policy, and future operational records
```

Proposed model:

```text
data/source_candidates.json
  contains real candidates and temporary fixtures under research

data/source_registry.json
  contains only policy-approved operational records
```

Source IDs remain stable across candidate promotion.

## 2. High-impact Findings

### 2.1 No dedicated source-contract validator exists

The local pipeline has validators for:

- articles and extractions
- tactical claims
- review outlines
- generated reviews

It does not currently have a validator dedicated to source candidates and registry records.

A new validator is required before data migration.

### 2.2 Candidate IDs currently participate in valid source references

`tools/normalize_article_extractions.js` builds its valid source ID set from:

```text
data/sources.json + data/source_registry.json
```

After separation, fixture article and extraction references would fail unless the validator temporarily includes candidate or fixture IDs.

This compatibility must not imply policy approval.

### 2.3 Source policy approval logic is semantically inconsistent

`tools/review_pipeline_lib.js` currently treats a source as policy-approved when one of several conditions is true, including:

- display source `checked_status=approved`
- display source `allowed_use=metadata-and-link-only`
- registry `allowed_use=approved`
- registry `robots_policy_status=approved`

The source registry specification does not define `allowed_use=approved`; it defines specific allowed-use values. Also, robots approval alone is not sufficient to establish overall source approval.

This logic must be replaced with one explicit registry approval rule.

### 2.4 Static source display uses registry as metadata fallback

`detail.js` loads `data/source_registry.json` and uses it when a source ID is absent from `data/sources.json`.

If the registry becomes empty while fixtures still reference candidate IDs, the UI would display raw IDs unless it can resolve candidate/fixture metadata.

### 2.5 Confidence and publication status may change

Review source coverage includes an approved-source-policy count. Correcting candidate and approval semantics may lower confidence or change generated review status for current fixtures.

This is expected and should be handled by deterministic fixture updates rather than by weakening approval rules.

## 3. File-by-file Impact

## 3.1 Data files

### `data/source_registry.json`

Required later changes:

- restrict to operational records
- add explicit `approval_status`
- add `runtime_status`
- retain compatibility `enabled`
- add approval, review, and runtime timestamps
- add policy evidence references
- enforce full-text and image storage defaults

Migration risk: high, because several pipeline layers resolve source IDs here.

### `data/source_candidates.json`

New file required after contract approval.

Responsibilities:

- real candidates under research
- temporary fixture records during migration
- candidate status and evidence
- no executable runtime enablement

### `data/sources.json`

This is display-oriented source metadata and is currently separate from crawler policy records.

Decision required:

- keep it as public article-level display metadata, or
- derive it from candidate/registry records in a later generation step

Do not merge these responsibilities during Step 11-D unless necessary.

### `data/articles.json`

Potential changes:

- source references remain stable
- add or validate source record kind if needed
- ensure candidate/fixture article status remains sample or unapproved
- prevent operational ingestion records from referencing unapproved candidates

### `data/article_extractions.json`

Potential changes:

- preserve fixture source references during migration
- ensure candidate or fixture evidence cannot count as approved policy
- add negative fixtures for candidate-only source use

### `data/tactical_claims.json`

Potential changes:

- expected confidence factors and status may change
- candidate-only evidence must be represented as unapproved
- supporting source IDs remain stable

### `data/review_outlines.json`

Potential changes:

- source coverage counts
- approved policy count
- confidence factors
- missing inputs
- status
- deterministic stability keys if source-policy inputs participate

### `data/generated_match_reviews.json`

Potential changes:

- confidence
- status
- source coverage
- limitations and missing-input text
- generated stability keys

## 3.2 Specifications

### `docs/source_registry_spec.md`

Major update required:

- candidate contract
- registry contract
- promotion gate
- approval status
- runtime status
- allowed transitions
- evidence and audit fields
- candidate exclusion from crawler inputs

### `docs/data_model.md`

Update required:

- add candidate dataset
- redefine registry as operational only
- explain temporary fixture compatibility
- update source reference resolution

### `docs/crawler_pipeline_spec.md`

Update required:

- crawler reads only active approved registry records
- candidate dataset is discovery and review input only
- runtime gate and kill switch
- source-level policy block reasons

### `docs/article_extraction_spec.md`

Update likely required:

- distinguish valid reference resolution from approved policy
- candidate/fixture references allowed only for local samples
- production extraction requires approved registry source

### `docs/review_generation_spec.md`

Update required:

- approved-source policy calculation
- candidate-only inputs lower coverage and prevent automatic publication
- single authoritative source approval function

### `docs/admin_operations_requirements.md`

Minor alignment required after final design:

- candidate and registry screens
- promotion action
- approval versus enablement action
- runtime status values

### `docs/development_roadmap.md`

No immediate structural change required. Step 11 already includes this decision and migration.

## 3.3 Runtime and validation code

### New `tools/normalize_source_registry.js`

Recommended responsibilities:

- parse candidate and registry arrays
- validate required fields and enums
- reject duplicate IDs within each dataset
- reject ambiguous active duplicates across datasets
- enforce candidate `enabled=false` or absence of runtime enablement
- enforce registry promotion fields
- enforce runtime enablement gate
- validate policy evidence structure
- enforce storage and paid-service guardrails
- produce deterministic summary
- provide negative self-tests or fixtures

Naming may be changed to `validate_source_contracts.js` if it validates both files.

### `tools/normalize_article_extractions.js`

Required changes:

- read candidate dataset
- build separate source ID sets:
  - resolvable source IDs
  - approved operational source IDs
- allow candidate/fixture IDs only in explicit sample records
- reject production-style extracted records from candidate-only sources
- report candidate-only source counts

### `tools/review_pipeline_lib.js`

Required changes:

- read candidate dataset only for fixture/source display resolution if necessary
- replace current `sourcePolicyApproved` logic
- require active approved registry status rather than one subfield
- do not treat robots approval alone as overall approval
- do not treat candidate allowed-use fields as registry approval
- consider centralizing source-policy resolution in one helper

Important current mismatch:

```text
registry.allowed_use == approved
```

is checked in code, while `approved` is not a specified `allowed_use` value.

### `tools/normalize_tactical_claims.js`

Likely changes:

- use centralized policy resolver
- recalculate policy-related confidence factors
- add candidate-only and suspended-source negative cases

### `tools/generate_review_outline_sample.js`

Likely changes:

- consume corrected coverage calculation
- update expected deterministic output

### `tools/normalize_review_outlines.js`

Likely changes:

- validate corrected approved-source counts
- ensure automatic publication conditions exclude candidates

### `tools/generate_structured_review_sample.js`

Likely changes:

- no direct contract change if it consumes outlines
- regenerated outputs may change because outline status changes

### `tools/normalize_generated_match_reviews.js`

Likely changes:

- validate updated source-coverage results
- confirm automatic publication is impossible with candidate-only policy

### `tools/run_local_level3_pipeline.js`

Required changes:

- run source-contract validation before article/extraction validation
- include source validation in negative self-tests
- fail before downstream generation on invalid promotion or enablement
- include candidate/registry files in deterministic checks when relevant

## 3.4 Front-end code

### `detail.js`

Required or likely changes:

- optionally load `data/source_candidates.json` for sample display
- distinguish source status labels:
  - fixture
  - candidate
  - approved but disabled
  - enabled
  - paused or suspended
- avoid showing candidate policy subchecks as overall approval
- keep public source display focused on sources actually used by the review

A future public release may choose not to expose candidate research records at all. During dry-run, transparent fixture labeling is sufficient.

### `app.js`

No confirmed direct source-registry dependency from the current analysis, but it should be checked during implementation and smoke testing.

### `tools/local_static_smoke.js`

Likely changes:

- confirm candidate file loading if added to the page
- confirm fixture status is visible
- confirm missing candidate file fallback if optional

## 3.5 CI and workflow files

### Existing dry-run workflow

Required changes after source validator exists:

- syntax-check the validator
- run source contract validation before the Level 3 pipeline
- run negative tests
- parse both source JSON files

No scheduled crawler or external network access should be introduced in Step 11-D.

## 4. Recommended Implementation Order

### PR 11-D1: contract specification

- update source registry specification
- add candidate specification
- finalize enums and transitions
- no JSON migration

### PR 11-D2: source validator

- add candidate and registry validator
- add negative self-tests
- integrate into CI/local pipeline
- no record movement

### PR 11-E1: data migration

- create `data/source_candidates.json`
- move current records
- classify real candidate versus fixture
- leave registry empty
- preserve IDs

### PR 11-E2: downstream compatibility

- update article/extraction source resolution
- centralize policy approval logic
- update confidence fixtures
- update generated deterministic outputs
- update static display

### PR 11-F: first real candidates

- research and add real candidate records
- evidence only
- no promotion or enablement without explicit user decision

## 5. Test Matrix

Source contract tests should include:

- valid real candidate
- valid fixture candidate
- candidate with `enabled=true` rejected
- candidate missing evidence state rejected when ready for decision
- valid approved registry record disabled
- enabled registry missing policy approval rejected
- enabled registry missing crawl method rejected
- duplicate ID across candidate and registry rejected
- retired source enabled rejected
- suspended source counted as unapproved
- candidate-only article accepted only as explicit sample
- candidate-only article rejected as production extracted input
- candidate-only review cannot become `auto_published`
- full-text or external-image storage defaults enforced
- paid API requirement blocked in current path

## 6. Likely PR Conflicts

The three Step 11 analysis PRs are independent because each adds a separate document.

Implementation PRs will likely overlap in:

- `docs/source_registry_spec.md`
- `docs/data_model.md`
- `tools/review_pipeline_lib.js`
- `tools/normalize_article_extractions.js`
- pipeline fixtures

For implementation, avoid parallel edits to the same core validator files unless branches have an explicit dependency order.

## 7. Key Decision Needed Before Implementation

Before Step 11-D begins, confirm:

1. separate candidate and registry datasets
2. stable ID preservation across promotion
3. explicit candidate, approval, and runtime statuses
4. fixture classification strategy
5. whether `data/sources.json` remains a separate display model
6. authoritative approval rule used by all downstream layers

## 8. Scope Boundary

This analysis does not:

- modify current source data
- approve FIFA or any other source
- add real candidates
- enable a crawler target
- call a real site or API
- introduce Firestore, authentication, an administrator UI, packages, or build tools
- change GitHub Pages or merge to `main`
