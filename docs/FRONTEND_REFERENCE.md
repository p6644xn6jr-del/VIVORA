# Frontend Reference

This document lists the Lab API and frontend files most relevant to the frontend handoff. It reflects the current code after `8961adb..HEAD`; do not assume endpoints or fields not listed here exist.

## P0-10 Tournament Title Image

Purpose: show the image title/badge that can be earned from a tournament.

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

Auth: not required.

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

- `404` or no title: `null` in `getTournamentTitle`.
- UI displays: `この大会の称号画像はまだ設定されていません。`

## P0-11 Own Profile Title Images

Purpose: show title images the logged-in user has earned.

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

Auth: not required for display. The frontend uses the stored logged-in public `user_id` for own profile.

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

- No titles: Profile displays `まだ獲得称号はありません。`
- No featured title: API returns `null`; frontend falls back to first title when available.

## P0-12 Other User Profile Title Images

Purpose: let another logged-in or non-logged-in viewer see a user's acquired title images.

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

Auth: not required for display.

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

- Profile title cards navigate to `/titles/:id`.
- Title detail displays title image, tournament, rank, score, awardee, and awarded date.
- Awardee row navigates to `/profile/:userId`.

## Set Featured Title

Purpose: allow a user to choose a representative acquired title.

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

Auth: required.

Important behavior:

- The backend verifies the `user_titles.id` belongs to the authenticated user.
- UI shows only a simple failure message, not migration/table/internal details.
- Requires manual migration 002 for `user_featured_titles`.

## Tournament Ranking

API:

```http
GET /tournaments/:id/ranking
```

Auth: not required.

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

- `records` is the canonical score source.
- Best record per user is used.
- `highest`, `lowest`, and `closest` are supported.
- Ties share the same rank.
- `decimal_places` controls score display precision.

## Finalize Results

API:

```http
POST /tournaments/:id/finalize
Authorization: Bearer <access_token>
```

Auth: required.

Permission:

- `admin`: allowed.
- `user`: `403`.
- unauthenticated: `401`.

Frontend:

- `hackason-frontend/src/pages/ContestDetail.jsx`
- `finalizeTournament` in `hackason-frontend/src/services/api.js`

Backend:

- `backend/routes/tournaments.js`
- `backend/utils/admin.js`
- `backend/utils/titleAwards.js`

Behavior:

- Uses ranking from `records`.
- Selects all tied rank-1 users.
- Upserts `user_titles` with `onConflict: user_id,title_id,tournament_id`.
- Sets `tournaments.result_finalized_at`.
- General users do not see the finalize button.

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

- `getStoredUser` and `login` normalize role in `services/api.js`.
- `ContestDetail.jsx` checks `currentUser.role === "admin"` before showing finalize.

Backend:

- `backend/middleware/auth.js` loads the profile and exposes `req.userRole`.
- `backend/utils/admin.js` checks admin permission.

Manual migration:

```text
backend/manual-migrations/004_admin_role_and_user_grants.sql
```

## Finished/Finalized Tournaments Are Read-Only

Backend rejects these actions when a tournament is `finished` or has `result_finalized_at`:

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

- `ContestDetail.jsx` hides participation/posting actions after finish.
- `Post.jsx` lists only active, non-finalized tournaments and also checks before submit.
- Finished detail status says `閲覧専用`.

## Media Upload For Posts

Frontend:

- `uploadPostMedia` in `hackason-frontend/src/services/api.js`
- `Post.jsx`

Storage:

```text
post-media
```

Behavior:

- Requires access token.
- Uploads directly to Supabase Storage.
- Gets a public URL.
- Saves `media: [{ mediaType, mediaUrl }]` through `POST /posts`.
- Maximum 5 media items.

## AI Evaluation Frontend Notes

The UI can request and display evaluation state, but a real AI provider is not connected.

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

Do not build ranking UI from `submission_evaluations.score`.
