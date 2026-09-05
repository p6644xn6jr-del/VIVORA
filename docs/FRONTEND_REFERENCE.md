# Frontend Reference

この資料は、フロント担当への共有で特に重要なLab APIとfrontend filesをまとめたものです。内容は現在の`8961adb..HEAD`のコードに基づいています。ここに書かれていないendpointやfieldが存在すると仮定しないでください。

## P0-10 Tournament Title Image

目的: 大会で獲得できる称号/バッジ画像を大会詳細で表示する。

Frontend files:

- `hackason-frontend/src/pages/ContestDetail.jsx`
- `hackason-frontend/src/pages/ContestDetail.css`
- `hackason-frontend/src/services/api.js`

Backend files:

- `backend/routes/tournaments.js`
- `backend/supabase-schema.sql`

API:

```http
GET /tournaments/:id/title
```

Auth: 不要です。

Main response fields:

```json
{
  "id": 1,
  "tournament_id": 1,
  "name": "ジャスト10秒王",
  "description": "...",
  "image_url": "...",
  "rarity": "winner"
}
```

Frontend normalized fields:

```text
id
titleId
tournamentId
name
description
imageUrl
rarity
```

Empty/error behavior:

- `404`またはtitle未設定の場合、`getTournamentTitle`は`null`を返します。
- UIでは`この大会の称号画像はまだ設定されていません。`を表示します。

## P0-11 Own Profile Title Images

目的: ログインユーザーが獲得したtitle imagesを自分のProfileに表示する。

Frontend files:

- `hackason-frontend/src/pages/Profile.jsx`
- `hackason-frontend/src/pages/Profile.css`
- `hackason-frontend/src/services/api.js`

Backend files:

- `backend/app.js`
- `backend/supabase-schema.sql`

API:

```http
GET /users/:id/titles
GET /users/:id/featured-title
```

Auth: 表示には不要です。自分のProfileでは、frontendが保存済みのpublic `user_id`を使います。

Main title list response fields:

```json
{
  "id": 1,
  "titleId": 1,
  "userId": 1,
  "tournamentId": 1,
  "tournamentTitle": "ジャスト10秒王",
  "name": "JUST 10",
  "description": "...",
  "imageUrl": "...",
  "rarity": "winner",
  "recordId": 1,
  "score": 10,
  "unit": "秒",
  "scoreText": "10.000秒",
  "rank": 1,
  "awardedAt": "..."
}
```

Featured title response fields:

```json
{
  "userId": 1,
  "userTitleId": 1,
  "titleId": 1,
  "tournamentId": 1,
  "tournamentTitle": "ジャスト10秒王",
  "titleName": "JUST 10",
  "titleImageUrl": "...",
  "awardedAt": "...",
  "rank": 1
}
```

Empty/error behavior:

- titleがない場合、Profileでは`まだ獲得称号はありません。`を表示します。
- featured titleがない場合、APIは`null`を返します。frontendは利用可能なtitleがあれば最初のtitleをfallback表示します。

## P0-12 Other User Profile Title Images

目的: ログイン中/未ログインに関係なく、他人のProfileでそのユーザーの獲得title imagesを表示する。

Frontend files:

- `hackason-frontend/src/pages/Profile.jsx`
- `hackason-frontend/src/pages/TitleDetail.jsx`
- `hackason-frontend/src/pages/TitleDetail.css`
- `hackason-frontend/src/services/api.js`

Backend files:

- `backend/app.js`

Routes:

```text
/profile/:id
/users/:id
/titles/:id
```

API:

```http
GET /user/:id
GET /users/:id/titles
GET /users/:id/featured-title
GET /user-titles/:id
```

Auth: 表示には不要です。

Title detail response fields:

```json
{
  "id": 1,
  "titleId": 1,
  "userId": 1,
  "tournamentId": 1,
  "tournamentTitle": "ジャスト10秒王",
  "name": "JUST 10",
  "description": "...",
  "imageUrl": "...",
  "rarity": "winner",
  "recordId": 1,
  "score": 10,
  "unit": "秒",
  "scoreText": "10.000秒",
  "rank": 1,
  "awardeeName": "Shion Watanabe",
  "awardeeIcon": "...",
  "awardedAt": "..."
}
```

UI behavior:

- Profileのtitle cardsは`/titles/:id`へ遷移します。
- Title detailではtitle image、tournament、rank、score、awardee、awarded dateを表示します。
- Awardee rowは`/profile/:userId`へ遷移します。

## Set Featured Title

目的: ユーザーが代表称号として表示するacquired titleを選べるようにする。

Frontend:

- `hackason-frontend/src/pages/TitleDetail.jsx`
- `setFeaturedTitle` in `hackason-frontend/src/services/api.js`

Backend:

- `PUT /me/featured-title` in `backend/app.js`

API:

```http
PUT /me/featured-title
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userTitleId": 1
}
```

Auth: 必須です。

Important behavior:

- Backendは、指定された`user_titles.id`が認証ユーザーのものか検証します。
- UIではmigration/table/internal detailを出さず、シンプルな失敗messageを表示します。
- `user_featured_titles`を使うため、manual migration 002が必要です。

## Tournament Ranking

API:

```http
GET /tournaments/:id/ranking
```

Auth: 不要です。

Source:

- `backend/routes/tournaments.js`
- `backend/utils/ranking.js`
- `public.records`

Main response fields:

```text
rank
recordId
postId
userId
score
unit
decimalPlaces
scoreText
verified
createdAt
distance
userName
userIcon
imageUrl
```

Rules:

- `records`がcanonical score sourceです。
- userごとのbest recordを使います。
- `highest`、`lowest`、`closest`をsupportします。
- tieは同じrankになります。
- `decimal_places`でscore display precisionを制御します。

## Finalize Results

API:

```http
POST /tournaments/:id/finalize
Authorization: Bearer <access_token>
```

Auth: 必須です。

Permission:

- `admin`: allowed。
- `user`: `403`。
- unauthenticated: `401`。

Frontend:

- `hackason-frontend/src/pages/ContestDetail.jsx`
- `finalizeTournament` in `hackason-frontend/src/services/api.js`

Backend:

- `backend/routes/tournaments.js`
- `backend/utils/admin.js`
- `backend/utils/titleAwards.js`

Behavior:

- `records`からrankingを作ります。
- 同率rank-1の全userを選びます。
- `onConflict: user_id,title_id,tournament_id`で`user_titles`へupsertします。
- `tournaments.result_finalized_at`を設定します。
- General userにはfinalize buttonを表示しません。

## Admin/User Role

Relevant field:

```text
public.users.role
```

Allowed values:

```text
user
admin
```

Frontend:

- `services/api.js`の`getStoredUser`と`login`がroleをnormalizeします。
- `ContestDetail.jsx`は`currentUser.role === "admin"`でfinalize button表示を判定します。

Backend:

- `backend/middleware/auth.js`がprofileを読み込み、`req.userRole`を設定します。
- `backend/utils/admin.js`がadmin permissionを判定します。

Manual migration:

```text
backend/manual-migrations/004_admin_role_and_user_grants.sql
```

## Finished/Finalized Tournaments Are Read-Only

tournamentが`finished`、または`result_finalized_at`ありの場合、Backendは次の操作を拒否します。

```http
POST /tournaments/:id/participants
POST /posts
POST /records
```

Expected status:

```text
409 Conflict
```

Frontend:

- `ContestDetail.jsx`は終了後にparticipation/posting actionsを隠します。
- `Post.jsx`はactiveかつnon-finalizedのtournamentsだけを一覧表示し、submit前にも確認します。
- Finished detail statusでは`閲覧専用`と表示します。

## Media Upload For Posts

Frontend:

- `uploadPostMedia` in `hackason-frontend/src/services/api.js`
- `Post.jsx`

Storage:

```text
post-media
```

Behavior:

- access tokenが必要です。
- Supabase Storageへfrontendから直接uploadします。
- public URLを取得します。
- `POST /posts`で`media: [{ mediaType, mediaUrl }]`を保存します。
- 最大5件までです。

## AI Evaluation Frontend Notes

UIはevaluation stateをrequest/displayできます。BackendにはOpenAI provider接続がありますが、実行には人間がBackend `.env`へ`OPENAI_API_KEY`を設定する必要があります。

API:

```http
GET /evaluations/posts/:postId
POST /evaluations/posts/:postId
GET /evaluations/tournaments/:tournamentId
```

Important rule:

```text
submission_evaluations = process/reasoning
records = canonical ranking score
```

Ranking UIを`submission_evaluations.score`から作らないでください。

AI評価対象は投稿mediaの先頭image 1枚です。
