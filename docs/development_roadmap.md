# Development Roadmap

この文書は、WorldCup2026Hub の開発ステップ全体像、現在地、および今後の実装順序を定義する。

GitHub 上の `main` と各仕様書を正本とし、このロードマップは実装順序と完了判断を整理するために使用する。

## 1. Product Goal

WorldCup2026Hub は、2026 FIFA World Cup の各試合について、承認済みの多言語ソースから情報を継続的に収集し、記事メタデータ、抽出ノート、戦術的主張、レビュー構成を整理したうえで、独自の日本語戦術レビューを生成・更新・公開するプラットフォームである。

利用者に提供する中心的価値は次のとおりである。

- 各国サイトを個別に巡回せず、主要な試合論点を日本語で理解できる
- 戦術分析、現地報道、公式情報、統計、監督・選手コメントを試合単位で確認できる
- 複数ソースの共通点と相違点を確認できる
- source coverage、confidence、missing inputs、uncertainty を確認できる
- 必要に応じて原典へ移動できる
- 試合終了直後だけでなく、数時間後から数日後に公開される分析を反映した最新版を読める

このシステムは、外部記事の転載、全文翻訳、長文引用の保存、独自映像解析を目的としない。

## 2. Target Operating Flow

完成時には、試合ごとに次の処理を継続的に実行する。

```text
match completion
  -> create match-specific crawl schedule
  -> collect approved official, statistical, media, tactical, and comment sources
  -> normalize article metadata and extraction notes
  -> normalize tactical claims
  -> generate review outline
  -> generate original Japanese review
  -> validate confidence, source coverage, references, and publication status
  -> publish or hold for review
  -> revisit the match as delayed articles appear
  -> regenerate and version the review
  -> reduce frequency or stop when completion conditions are met
```

レビューは一度生成して終了するものではない。速報、初期レビュー、戦術分析反映版、long-form 反映版へ段階的に更新する。

## 3. Completed Steps

### Step 1: Repository and Development Workflow

Status: completed

- Repository and `main` source-of-truth policy
- Feature branch and worktree workflow
- ChatGPT, Codex, GitHub, and user role separation
- Merge and boundary-change approval rules
- `AGENTS.md`

### Step 2: Static Site MVP

Status: completed

- Top page
- Match list
- Team list
- Match detail
- Team detail
- Responsive static site

### Step 3: JSON-driven MVP

Status: completed

- JSON-backed match, team, source, and review records
- Separation of data and rendering logic
- GitHub Pages-compatible static operation

### Step 4: Automation-first and Level 3 Direction

Status: completed

- Automatic collection as the target operating model
- Source-based structured tactical review
- Original Japanese synthesis rather than translation
- Source transparency and uncertainty handling
- Deterministic generation requirement

### Step 5: Wave 1 MVP Foundation

Status: completed

- Initial data model
- Source registry scaffold
- Crawl run scaffold
- Generated review and generation-run scaffold
- MVP integration

### Step 6: Wave 1 Integration Verification

Status: completed

- JSON references
- Match and team detail rendering
- Source and review display
- Fallback handling
- Mobile verification

### Step 7: Public v0.1 and Wave 2 Polish

Status: completed

- Japanese public UI
- Public copy and mobile improvements
- Visible sample and dry-run state
- Confidence and source coverage display

### Step 8: GitHub Pages and Product Requirements

Status: completed

- GitHub Pages publication
- Product requirements
- Site concept
- User value and non-goals
- Source transparency and missing-input policy
- User device verification

### Step 9: Article and Extraction Layer

Status: completed for local dry-run

- Article contract
- Article extraction contract
- Canonical URL and reference validation
- Evidence, uncertainty, disagreement, and duplicate metadata
- Prohibited content-field checks

Not completed:

- Real source ingestion
- Production parsers
- Live extraction operations

### Step 10: Level 3 Review Generation

Status: major local dry-run scope completed

- Tactical claim contract and validator
- Review outline generation and validation
- Original Japanese generated-review contract
- Deterministic generation
- Confidence, source coverage, missing-input, and disagreement propagation
- One-command local pipeline
- Atomic write and partial-write prevention
- Static display of generated reviews and quality metadata

## 4. Current Position

```text
Wave 3: Local Level 3 Review Pipeline
completed, including user device verification

Current position:
before Wave 4 implementation
```

The local pipeline is ready to transform approved, structured inputs into validated generated reviews. It is not yet connected to approved live sources or tournament operations.

## 5. Planned Steps

### Step 11: Source Candidate and Approval Model

Purpose: define how real source candidates are researched, approved, blocked, retired, and enabled.

Required decisions:

- Single-registry versus candidate/approved separation
- Candidate lifecycle
- Approval status values
- Relationship between approval status and `enabled`
- robots.txt, Terms of Service, copyright, attribution, and allowed-use evidence
- Rejection, hold, retirement, and re-review history
- Migration of existing placeholder records
- Administrator-editable contract design

No live source is enabled in this step.

### Step 12: Fixture-based Ingestion and Crawler Safety

Purpose: prove source-specific ingestion without uncontrolled live crawling.

Scope:

- Fixture-based parser contract
- Metadata-only and short-original-note boundaries
- URL canonicalization and duplicate detection
- Timeout and retry policy
- Rate limiting
- User-agent policy
- Source disable switch
- Global kill switch
- Ingestion logs
- Failure and rollback behavior

Real-site access remains controlled and separately approved.

### Step 13: Match-level Recurring Crawl Model

Purpose: define how each match is revisited as delayed analysis appears.

The contract must support:

- Match end time
- Initial crawl offset
- Recurring crawl offsets or intervals
- Source-category-specific timing
- Priority
- Next scheduled run
- Last successful run
- Manual pause and resume
- Manual rerun request
- Stop conditions
- Review regeneration conditions
- Administrator override

A default schedule may include checkpoints such as match end plus 1, 3, 6, 12, 24, 48, and 72 hours, but the final schedule must be configurable rather than hard-coded.

### Step 14: Controlled Real Ingestion

Purpose: validate approved real sources with a narrow operational scope.

Initial scope:

- Small number of approved sources
- Small number of matches
- No uncontrolled broad crawling
- Parser and duplicate verification
- Extraction-quality review
- Logging, retry, rate-limit, and stop verification

### Step 15: Automated Review Updates and Versioning

Purpose: update reviews when new source material is discovered.

Required capabilities:

- Review version history
- Generated time and generation version
- Added and removed source references
- Added, changed, and disputed claims
- Confidence and source-coverage changes
- Missing-input changes
- Draft, publish, hold, and rollback states
- Stable public latest version with auditable history

### Step 16: Operational Model and System-of-Record Decision

Purpose: finalize runtime architecture before building the administrator UI.

Decisions include:

- GitHub JSON, Firestore, or hybrid system of record
- Scheduler and crawler execution platform
- Which operations are automatic
- Which operations require administrator confirmation
- Audit-log requirements
- Emergency source and crawler shutdown
- Publication and rollback authority
- Data synchronization between runtime storage and public static artifacts

### Step 17: Administrator Interface

Purpose: provide a separate authenticated interface for the single administrator.

The administrator interface is a confirmed product requirement, but it must not be implemented before the crawler, scheduler, source lifecycle, and runtime system of record are sufficiently defined.

Target capabilities:

- Add and edit source candidates
- Review source-policy evidence
- Approve, block, retire, enable, and disable sources
- Configure per-match recurring crawl schedules
- Pause, resume, and request reruns
- Inspect crawl, extraction, generation, and validation results
- Inspect review versions and quality signals
- Control publication and rollback where required

Authentication direction:

- Separate administration URL
- Firebase Authentication with Google sign-in
- One allowed administrator account
- Authorization restricted by Firebase UID
- No public signup, multi-role model, or complex account administration in the initial implementation

The administration URL may be linked from the main site during private development. A non-obvious URL is only a convenience and is not the security boundary.

### Step 18: Tournament Operations and Public v1.0

Purpose: operate the full tournament workflow.

Scope:

- Full match schedule coverage
- Recurring post-match collection
- Review regeneration as delayed articles appear
- Approved automatic publishing
- Monitoring and alerts
- Source and crawler shutdown controls
- Rollback
- Operational documentation
- Public v1.0 readiness

## 6. Administrator-first Contract Principle

Although the administrator interface is deferred, Steps 11 through 16 must be designed so that an administrator can later modify operational settings without changing application code.

Contracts should therefore use:

- Stable IDs
- Explicit status values
- Editable schedules rather than hard-coded timing
- Created, updated, reviewed, and effective timestamps
- Reviewer or administrator identity fields
- Policy evidence and notes
- Audit-friendly state transitions
- Separate approval and runtime enablement concepts
- Explicit pause, stop, and rollback states

## 7. Implementation Rule for the Administrator Interface

Do not build the administrator UI merely to display provisional fields.

Implementation begins after all of the following are sufficiently stable:

1. Source candidate and approval lifecycle
2. Crawler and parser contract
3. Match-level recurring crawl schedule contract
4. Runtime storage and system-of-record decision
5. Execution and audit model
6. Publication and rollback authority

Until then, configuration may be maintained through reviewed repository data and documentation.

## 8. Immediate Next Step

The next formal development step is Step 11: Source Candidate and Approval Model.

The first task is to compare the existing single-registry model with a separated candidate/approved model, define lifecycle and status semantics, and decide how existing source records migrate. This design must be completed before adding real sources, enabling crawlers, or implementing the administrator interface.
