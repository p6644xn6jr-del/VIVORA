# VIVORA Lab

VIVORA Labは、チーム版のbaseline commitから作成した個人検証用リポジトリです。

```text
8961adb Initial VIVORA baseline
```

このリポジトリはチーム本番リポジトリではなく、チーム実装を置き換えるものでもありません。MVPの挙動を具体化し、UXとAPI contractを検証し、PM/デザイン/フロントエンド担当がチーム版へ何を持ち込むか判断するための参考実装です。

## 重要な安全注意

このリポジトリは、専用のVIVORA Lab環境だけに接続します。

このLab schemaや設定を、チームSupabaseや本番Supabaseへそのまま適用しないでください。

現在のLab database policyは、ローカル検証を優先した意図的に緩い構成です。

```text
application tables: RLS OFF
Lab Data API GRANTs: anon/authenticated
Backend table client: SUPABASE_ANON_KEY
```

これは本番用のセキュリティモデルではありません。本番ではserver-only credentials、またはauthenticated JWTを使ったRLS policyを前提に再設計してください。`.env`の値、API key、service role key、secretはREADMEやdocsに記載しないでください。

## チーム版との関係

- `origin/main`は個人用GitHub repository `p6644xn6jr-del/VIVORA` を指します。
- baseline `8961adb` は、チームコードをコピーしてLabを開始した時点です。
- `8961adb`以降のcommitは、Lab専用の参考実装・検証作業です。
- Labの目的は具体的な挙動を比較しやすくすることであり、チームメンバーの実装を上書きすることではありません。

## Directory構成

```text
backend/
  app.js
  middleware/
  routes/
  utils/
  tests/
  manual-migrations/
  supabase-schema.sql

hackason-frontend/
  src/
    components/
    pages/
    services/api.js
  package.json

docs/
  CHANGES_FROM_BASELINE.md
  FRONTEND_REFERENCE.md
```

## Setup

必要に応じてローカルに`.env`ファイルを用意してください。値はcommitしたり、チャットやドキュメントへ貼り付けたりしないでください。

Backendで想定しているenvironment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Frontendで想定しているenvironment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

任意のAI provider environmentは、このLabではデフォルト未設定です。

## Backend起動

```sh
cd backend
npm install
npm run dev
```

Default API origin:

```text
http://localhost:3000
```

## Frontend起動

```sh
cd hackason-frontend
npm install
npm run dev
```

Default frontend origin:

```text
http://localhost:5173
```

## Supabase

専用のVIVORA Lab Supabase projectだけを使用してください。

空のLab Supabaseを新規構築する場合は、次のSQLから開始します。

```text
backend/supabase-schema.sql
```

すでに古いschemaを適用済みのLab Supabaseでは、必要に応じてmanual migrationsを順番に適用します。

```text
backend/manual-migrations/001_ai_evaluation_foundation.sql
backend/manual-migrations/002_title_identity_and_tournament_series.sql
backend/manual-migrations/003_constrain_evaluation_statuses.sql
backend/manual-migrations/004_admin_role_and_user_grants.sql
```

Labで使用するStorage buckets:

- `post-media`: 投稿画像/動画upload用のpublic media bucket。
- `title-images`: 称号/バッジ画像表示用のpublic bucket。

## Labで実装済みの主要機能

`8961adb..HEAD`以降のLab参考実装には、以下が含まれます。

- Supabase Authを使ったsignup/loginとaccess token利用。
- `auth.users.id`と`public.users.id`のpublic user profile紐付け。
- Supabaseからの大会一覧/大会詳細取得。
- 認証ユーザーによる大会参加、重複参加防止、実参加人数表示。
- 画像/動画media uploadと最大5件制限を含む大会投稿flow。
- rankingのcanonical score sourceとしての`records` table。
- `highest`、`lowest`、`closest`によるranking、userごとのbest record、tie handling。
- 大会結果finalizeとwinner title付与。
- 画像中心の称号:
  - P0-10: 大会詳細で獲得できるtitle imageを表示。
  - P0-11: 自分のProfileで獲得title imagesを表示。
  - P0-12: 他人のProfileで獲得title imagesを表示。
- title image、tournament、rank、score、awardee、awarded date、profile linkを表示するTitle detail page。
- ユーザーのrepresentative titleとしてのfeatured title選択。
- admin/user roleの基盤。
- adminだけが大会結果をfinalizeできる制御。
- finished/finalized tournamentを、新規参加・大会投稿・record作成に対してread-onlyにする制御。
- Post comments、likes、post detail、tag-based discovery。
- Tournament recommendations。
- Tournament series foundation。
- AI evaluation foundation。

## Recordsはrankingのcanonical source

Objective tournamentとAI tournamentは、どちらも`records`からrankingを作る設計です。

現在の想定flow:

```text
post
submission_evaluations = pending/processing/completed/failed
AI score and reasoning stored in submission_evaluations
completed AI score reflected into records
records used for best-per-user ranking
ranking used for titles
```

`submission_evaluations`は評価processとreasoningを保存するtableです。ranking用の第二のcanonical tableにはしない方針です。

## AI Evaluationの状態

LabにはAI evaluation用のschema、route、UI foundationがありますが、実際のexternal AI providerは未接続です。

現在の挙動:

- Objective evaluationはnumeric recordsから完了できます。
- AI evaluationにはimage mediaが必要です。
- provider未設定の場合、fake scoreは生成せず、明示的なerror codeでfailedになります。
- completed AI evaluationsは、final scoreを`records`へ同期する想定です。

## Admin And User

Labでは`public.users.role`を使います。

```text
user
admin
```

新規ユーザーのdefaultは`user`です。`manual-migrations/004_admin_role_and_user_grants.sql`は、人間が`user_id = 1`がShion Watanabeであることを確認した上で、そのLab userをadminにします。

Adminはtournament resultsをfinalizeできます。General userにはfinalize buttonが表示されず、finalize APIを直接呼んでも`403`になります。

Labのapplication tablesはRLS OFFのため、これは参考実装であり、本番用securityではありません。

## Future Workは未完成

以下はfoundationまたはexperimentであり、完成機能ではありません。

- Real AI provider integration。
- Production-grade AI evaluation queue/workers。
- Tournament series product UX。
- title equip slots、title animations、notification feed、Proseka-style title customizationなどの高度なtitle/badge UX。
- Production Supabase security hardening。

関連資料:

- `docs/CHANGES_FROM_BASELINE.md`
- `docs/FRONTEND_REFERENCE.md`
