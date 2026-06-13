# Source Registry Current State and Migration Analysis

This document analyzes the current `data/source_registry.json` and proposes a migration path for Step 11.

It is analysis only. It does not approve a source, add a crawler target, enable crawling, access a real site, or change runtime data.

## 1. Current File Summary

`data/source_registry.json` currently contains six records. Every record has `enabled=false` and `crawl_method=disabled`.

| ID | URL type | Intended role | Current nature |
|---|---|---|---|
| `candidate-official-fifa` | real FIFA home URL | official, match report | real source candidate, not reviewed |
| `candidate-statistics-source` | example.com | statistics | placeholder fixture |
| `candidate-tactical-analysis-ja` | example.com | Japanese tactical analysis | placeholder fixture |
| `candidate-longform-analysis` | example.com | long-form, preview | placeholder fixture |
| `candidate-manager-comments` | example.com | manager/player comments | placeholder fixture |
| `candidate-video-analysis` | example.com | video analysis | placeholder fixture |

The file therefore functions as a combined:

- source candidate list
- policy-review scaffold
- fixture source catalog
- future crawler registry
- review-pipeline source reference catalog

That combination was useful for local dry-run development, but it is not a safe final operational model.

## 2. Current Strengths

The current records already establish useful boundaries:

- stable IDs
- languages and categories
- disabled crawl method
- separate robots and terms statuses
- explicit allowed-use and storage policies
- `full_text_storage_allowed=false`
- no paid API requirement
- explicit `enabled=false`
- timestamps and notes

These fields should be preserved or mapped during migration.

## 3. Current Gaps

### 3.1 Candidate and operational records are mixed

All IDs use a `candidate-` prefix, yet the file is also defined as the crawler registry. A future crawler reading this file must apply several indirect checks to distinguish research records from executable records.

### 3.2 Placeholder and real candidates are mixed

Five records use example.com and are fixtures. One record points to FIFA. Without an explicit `record_kind` or separate dataset, automation and administrator tooling cannot reliably distinguish:

- real candidate
- fixture candidate
- approved source
- retired source

### 3.3 No explicit approval lifecycle

The current fields describe policy subchecks, but there is no top-level:

- candidate status
- approval status
- decision result
- reviewed by
- approved by
- evidence list
- next review time

### 3.4 Runtime state is only a boolean

`enabled=false` cannot distinguish:

- never approved
- approved but not yet activated
- manually paused
- automatic error hold
- emergency disabled
- retired

### 3.5 Policy values are not fully normalized

The source registry specification lists `allowed_use` values such as:

- `metadata-and-link-only`
- `metadata-link-and-short-original-notes`
- `metadata-extraction-notes-and-generated-review`
- `blocked`
- `manual-review-needed`

Other parts of the local review pipeline use approval checks that include values such as `approved`, creating a semantic mismatch that must be resolved before real operation.

### 3.6 No registry-specific validator

The current pipeline validates article, extraction, claim, outline, and generated-review layers, but there is no dedicated source candidate and registry validator enforcing:

- allowed statuses
- promotion gates
- runtime gates
- duplicate IDs across candidate and registry datasets
- timestamp and evidence requirements
- approved-use consistency

## 4. Record-by-record Recommendation

### `candidate-official-fifa`

Recommended treatment:

- move to `data/source_candidates.json`
- preserve ID during initial migration
- keep disabled and unapproved
- mark as a real candidate rather than a fixture
- complete robots, terms, copyright, access-method, and allowed-use research in a later approved source-review PR
- do not promote to operational registry solely because it is an official source

### `candidate-statistics-source`

Recommended treatment:

- move to candidate fixtures or a dedicated fixture dataset
- mark explicitly as `fixture`
- never promote the example.com URL
- preserve ID temporarily because current article/extraction/claim fixtures may reference it
- replace with a researched real statistics candidate only through a separate source-addition decision

### `candidate-tactical-analysis-ja`

Recommended treatment:

- keep as fixture-only data during migration
- preserve ID until references are migrated
- do not treat it as a real candidate
- create separate real Japanese tactical-analysis candidates later

### `candidate-longform-analysis`

Recommended treatment:

- keep as fixture-only data during migration
- preserve ID while dry-run review fixtures reference it
- do not count it as approved source policy

### `candidate-manager-comments`

Recommended treatment:

- keep as fixture-only data during migration
- later replace with one or more real official press-conference, federation, broadcaster, or media sources
- avoid combining too many operational roles in one future source record unless the site genuinely provides them

### `candidate-video-analysis`

Recommended treatment:

- keep as metadata-only fixture
- do not download, store, transcribe, or embed video through this migration
- future real video-source use requires separate access, copyright, transcript, embedding, and storage decisions

## 5. Recommended Target Files

### `data/source_candidates.json`

Contains real source candidates under research.

Recommended distinguishing field:

```json
{
  "record_kind": "real_candidate"
}
```

### `data/source_registry.json`

Contains only approved operational source records. It may initially be empty.

A record may be present while disabled, but it must have passed the promotion gate.

### Fixture handling options

Preferred option:

```text
data/fixtures/source_candidates.fixture.json
```

Alternative for minimal migration:

- retain fixture records in `data/source_candidates.json`
- use `record_kind=fixture`
- ensure validators and runtime code exclude fixtures from real-source and approved-coverage calculations

The minimal option avoids immediate fixture-reference rewrites and is recommended for the first migration PR.

## 6. ID Migration Strategy

### Phase 1: preserve all current IDs

Move current records without changing IDs. This minimizes changes to:

- articles
- extractions
- tactical claims
- review outlines
- generated reviews
- static source display

### Phase 2: make record type explicit

Add `record_kind` values:

- `real_candidate`
- `fixture`
- `operational_source`

Operational registry records should always use `operational_source`.

### Phase 3: decouple fixture references

Later, if clearer naming is worthwhile, migrate fixture IDs in a dedicated PR with validator-supported reference updates. Do not combine this with the initial candidate/registry split.

## 7. Proposed Migration Sequence

### Migration PR 1: schemas and validators

- define candidate and registry contracts
- define allowed statuses
- add candidate/registry validator
- validate duplicate IDs across both files
- enforce that candidate records cannot be enabled
- enforce promotion and runtime gates
- add negative tests

No data movement yet.

### Migration PR 2: split current records

- create `data/source_candidates.json`
- move all six current records from registry to candidates
- classify FIFA as `real_candidate`
- classify example.com records as `fixture`
- leave `data/source_registry.json` empty
- preserve IDs
- update docs

### Migration PR 3: pipeline compatibility

- update source ID resolution to read display sources, candidates, and registry where needed for fixtures
- ensure candidate and fixture records do not count as approved policy
- update UI labels so candidate/fixture status is honest
- run the complete local Level 3 pipeline

### Migration PR 4: first real candidate research

- add researched real source candidates
- include policy evidence and decision fields
- do not promote or enable without explicit user approval

### Migration PR 5: first registry promotion

- promote an approved source to `source_registry`
- start disabled
- verify parser fixture and runtime safety
- request separate approval before `enabled=true`

## 8. Compatibility Risks

### Article and extraction references

The article/extraction validator currently treats IDs from `data/sources.json` and `data/source_registry.json` as valid. Splitting candidates requires temporary inclusion of candidate IDs for dry-run fixture validation.

### Review source policy calculation

The review pipeline reads `data/source_registry.json` and derives approved-source coverage from policy fields. Moving all records out without compatibility changes would alter confidence and review status. This must be an intentional change with updated expected fixtures.

### Static display

`detail.js` loads `data/source_registry.json` as a fallback source metadata catalog. An empty registry would make candidate-referenced fixtures show IDs unless it also reads the candidate or fixture dataset.

### Documentation

`docs/data_model.md`, `docs/source_registry_spec.md`, crawler docs, roadmap, and README currently describe a combined registry. They need coordinated updates after the design decision is accepted.

## 9. Recommended Decision

Adopt separate candidate and operational datasets.

For the first migration:

- preserve IDs
- classify records explicitly
- keep fixtures available to the local pipeline
- leave operational registry empty
- do not add real sources in the same PR
- do not change enablement
- update validators before or together with data movement

This gives a clear crawler trust boundary without forcing a large simultaneous rewrite.

## 10. What This Analysis Does Not Approve

This document does not approve:

- FIFA crawling
- any example.com record as a real candidate
- any new source target
- any source promotion
- any source enablement
- any external access method
- any full-text, image, transcript, or video storage
- any paid API, secret, database, authentication, or administrator UI implementation
