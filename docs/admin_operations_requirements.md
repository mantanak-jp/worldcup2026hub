# Administrator and Operations Requirements

この文書は、WorldCup2026Hub の管理者向け運用要件を定義する。

管理画面の実装仕様ではなく、crawler、scheduler、source approval、review generation、publishing を管理者が将来変更・監視できるようにするための要求である。

## 1. Scope

WorldCup2026Hub は、試合終了後に一度だけ情報を収集するシステムではない。

戦術レビュー、long-form analysis、監督・選手コメント、詳細統計は、試合終了から数時間後または数日後に公開される。そのため、試合ごとに一定期間、承認済みソースを再巡回し、新しい情報が見つかった場合にレビューを再生成・更新する。

管理者は、source、巡回スケジュール、pipeline 状態、review version、publication status を確認・変更できる必要がある。

## 2. Confirmed Administration Direction

- 管理者は当面1名とする
- 管理画面は公開サイトとは別URLとする
- Firebase Authentication の Google sign-in を使用する方向とする
- 許可された管理者Firebase UIDだけにアクセスを限定する
- 公開signup、複数role、複雑なaccount管理は初期実装の対象外とする
- URLを推測しにくくすることは補助策であり、認証の代替にはしない
- private development中はメインサイトから管理画面への導線を置いてもよい

ただし、管理画面はcrawler、scheduler、source lifecycle、runtime storageが固まる前には実装しない。

## 3. Source Administration Requirements

管理者は将来、次の操作を行える必要がある。

- source候補の追加と編集
- source名、base URL、言語、国・地域、categoryの設定
- discovery method、RSS、sitemap、access typeの設定
- robots.txt、Terms of Service、copyright、allowed useの審査状態更新
- policy evidence URLと調査メモの記録
- reliabilityとtactical usefulnessの評価
- approval statusの変更
- sourceのblock、retire、再審査
- crawler利用のenable、disable
- rate limit、user-agent、collection methodの設定
- source障害時の緊急停止

`approval_status`と`enabled`は別概念とする。

- `approval_status`: policy上どこまで利用可能か
- `enabled`: 現在crawlerが実行対象としてよいか

承認済みsourceであっても、障害、規約変更、品質問題により `enabled=false` にできる必要がある。

## 4. Match-level Crawl Schedule Requirements

管理者は試合ごとに次を設定・変更できる必要がある。

- match ID
- 試合開始・終了時刻
- 初回巡回のoffset
- 再巡回のoffsetまたはinterval
- source category別の巡回タイミング
- 優先度
- next crawl time
- 最大巡回期間
- 新規記事がない場合の減速条件
- 巡回停止条件
- review再生成条件
- 自動公開可否
- editorial review要否
- pause、resume、manual rerun

初期の検討値として、試合終了後1、3、6、12、24、48、72時間を使用できるが、固定実装にはしない。

公式情報や速報は早期に、戦術専門記事やlong-form analysisは遅い時間帯にも巡回できるよう、source categoryごとのscheduleを持てることが望ましい。

## 5. Crawl and Pipeline Monitoring Requirements

管理者は次を確認できる必要がある。

- 最終巡回時刻
- 次回巡回予定
- 実行成功・失敗
- 対象source
- HTTP statusまたは取得失敗理由
- 新規記事数
- 重複記事数
- parser成功・失敗数
- extraction成功・失敗数
- review再生成有無
- validation error
- retry回数
- rate-limit状態
- pauseまたはstop理由

試合単位、source単位、pipeline run単位で確認できる構造を目指す。

## 6. Review Administration Requirements

管理者は次を確認・操作できる必要がある。

- 現在公開中のreview version
- draft、hold、published、blockedなどのstatus
- generated timeとgeneration version
- source coverageとconfidence
- missing inputsとuncertainty
- disagreement summary
- 使用source、article、extraction、claim
- 前版との差分
- 追加・削除されたsource
- 追加・変更されたclaim
- manual regeneration request
- publish、hold、unpublish
- rollback

レビューは単純上書きではなく、少なくとも監査可能なversion historyを持つ。

## 7. Audit Requirements

重要操作には監査記録を残す。

対象例:

- source candidate追加
- policy status変更
- source approval
- enable、disable、block、retire
- crawl schedule変更
- manual rerun
- kill switch
- review publish、hold、rollback

監査情報には次を含める。

- action
- target type and ID
- previous state
- new state
- administrator identity
- timestamp
- reason or note

## 8. Runtime Storage Direction

Firestoreは管理画面と可変運用データの保存先候補とする。

ただし、Firestoreの正式採用範囲は、crawlerとschedulerの実行基盤を決めた後に確定する。

候補となる構成:

- GitHub JSON: contract samples、公開用生成artifact、レビュー可能な静的正本
- Firestore: source運用状態、試合別schedule、run history、管理者操作、audit log
- Hybrid: Firestoreをruntime state、GitHubをversioned public artifactとする

管理画面実装前に、system of recordと同期方向を確定する。

## 9. Security Requirements

初期管理画面では次を満たす。

- Firebase Authentication Google sign-in
- 管理者Firebase UID固定
- 未認証時はログイン画面のみ表示
- 非許可アカウントには管理UIを表示しない
- Firestore Security Rulesでも同じUIDに限定する
- service account keyやsecretをGitHub Pagesへ配置しない
- browser-side表示制御だけを認可境界にしない

crawlerやscheduled jobが使用する権限は、管理画面のbrowser権限と分離する。

## 10. Deferred Implementation Rule

管理画面は正式要件だが、次が確定するまでは実装しない。

1. Source candidate and approval lifecycle
2. Source registry contract
3. Fixture-based parser and crawler safety contract
4. Match-level recurring crawl schedule contract
5. Review update and versioning contract
6. Runtime system of record
7. Scheduler and crawler execution platform
8. Audit and emergency-stop model

それまでは、管理者が将来変更する前提でcontractを設計し、必要な設定はrepository上のreviewed dataまたは文書で管理する。

## 11. Current Decision

現在地はWave 3完了、Wave 4開始前である。

直近では管理画面を作らず、Step 11からStep 16で管理対象となるデータ、status、state transition、schedule、audit fieldsを確定する。

管理画面の実装はDevelopment RoadmapのStep 17で行う。
