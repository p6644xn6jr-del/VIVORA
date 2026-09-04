# Changes From Baseline

Baseline:

```text
8961adb Initial VIVORA baseline
```

This document is based on:

```sh
git diff --name-status 8961adb..HEAD
git diff --stat 8961adb..HEAD
```

At the time this document was created, the Lab implementation diff before adding these handoff documents changed 51 files with 5591 insertions and 280 deletions.

## A. Existing Baseline Files Changed

### `backend/app.js`

Baseline role:

- Express app setup.
- Mounted auth, posts, challenges, dummy, tournaments, and tags routes.
- Had `/users`, `/user/:id`, legacy `/signup` and `/login`.
- Had an in-memory `/record` endpoint and a temporary `/ranking` endpoint.

Lab changes:

- Mounted `records`, `evaluations`, `recommendations`, and `tournament-series` routes.
- Replaced legacy `/record` behavior with the real records route.
- Added user title APIs:
  - `GET /users/:id/titles`
  - `GET /me/titles`
  - `GET /user-titles/:id`
  - `GET /users/:id/featured-title`
  - `PUT /me/featured-title`
- Added role normalization to user responses.
- Added `scoreText` formatting for title records.

Reason:

- Make profile/title MVP behavior concrete and connect titles to real users, tournaments, and records.

Related features:

- P0-11 own profile title images.
- P0-12 other profile title images.
- Representative title.
- records canonical ranking.

Frontend reference value:

- High. Use these response shapes for title/profile integration.

Lab-only caution:

- Uses broad Lab Data API access through `SUPABASE_ANON_KEY`; not production security.

### `backend/middleware/auth.js`

Baseline role:

- Verified Supabase access token.
- Looked up `public.users.user_id`.
- Set `req.authUser` and `req.userId`.

Lab changes:

- Selects the full public user profile.
- Sets `req.user`, `req.userId`, and `req.userRole`.
- Normalizes unknown roles to `user`.

Reason:

- Backend routes need authenticated public user identity and admin/user role.

Related features:

- Admin-only finalize.
- User-owned featured title update.

Frontend reference value:

- Medium. Useful for understanding why frontend must send `Authorization: Bearer <access_token>`.

Lab-only caution:

- Role is a Lab reference design; production should harden role writes with RLS/server-only controls.

### `backend/routes/tournaments.js`

Baseline role:

- Listed tournaments from Supabase.
- Created tournaments with body-provided `created_by`.
- Joined/cancelled participation with body-provided `userId`.
- Built ranking from `posts.record`.

Lab changes:

- Requires authentication for tournament creation, join, cancel, and finalize.
- Uses `req.userId`; frontend no longer sends userId for join/finalize.
- Counts participants from `tournament_participants`.
- Adds real status via `getTournamentStatus`.
- Adds `GET /tournaments/popular`.
- Adds `GET /tournaments/results/summary`.
- Adds `GET /tournaments/:id/title`.
- Adds `GET /tournaments/:id/ranking` from `records`.
- Adds `POST /tournaments/:id/finalize`.
- Awards titles to all tied rank-1 users.
- Blocks new participation after `finished` or `result_finalized_at`.

Reason:

- Support the MVP flow from tournament discovery to participation, ranking, finalization, and title award.

Related features:

- P0 tournament list/detail/participation.
- P0-10 title image on tournament detail.
- Ranking.
- Title award.
- Admin/user.
- Finished tournament read-only behavior.

Frontend reference value:

- Very high. This is the main tournament contract for frontend work.

Lab-only caution:

- Finalize is implemented for Lab admin workflow only; production needs a stronger admin model.

### `backend/routes/posts.js`

Baseline role:

- Created posts with request body `userId`.
- Required tags for all post types.
- Stored simple post fields.

Lab changes:

- Requires access token for create/like/comment mutations.
- Uses authenticated `req.userId`.
- Supports `media` JSON with max 5 image/video items.
- Supports tournament posts with `tournament_id`.
- Allows tournament posts with empty tags so they do not pollute commitment tags.
- Blocks tournament post creation after tournament finish/finalize.
- Adds likes, likedByMe, comments count, and comment endpoints.

Reason:

- Make posts user-owned, support media, and connect tournament submissions without fake/dummy user IDs.

Related features:

- P0 posting.
- P0 image/video posting.
- Tournament-post linkage.
- Likes/comments P1.
- Finished tournament read-only behavior.

Frontend reference value:

- High for `Post.jsx`, `PostCard.jsx`, and post detail.

Lab-only caution:

- Storage upload is done directly by frontend with anon key and authenticated JWT; production policies should be reviewed.

### `backend/routes/tags.js`

Baseline role:

- Aggregated tags from `posts.tags`.

Lab changes:

- Ignores default `こだわり`.
- Ignores `大会`.
- Ignores tournament posts for popular commitment tags.

Reason:

- Prevent tournament activity from appearing as `#大会` in the Home commitment tag area.

Related features:

- Home feed and Discover.

Frontend reference value:

- Medium. Useful for Home popular tag behavior.

Lab-only caution:

- Tag UX is lightweight and not final product taxonomy.

### `backend/package.json`

Baseline role:

- Backend package metadata and dependencies.

Lab changes:

- Added/updated script support used by Lab tests.

Reason:

- Run backend `node --test` checks for ranking, status, title awards, admin, result summary, and AI evaluation logic.

Frontend reference value:

- Low.

Lab-only caution:

- Do not treat package metadata wording as product direction.

### Frontend `hackason-frontend/src/App.jsx`

Baseline role:

- Registered core routes for Home, Discover, Contest, ContestDetail, JoinedContests, Post, Notifications, Profile, TagDetail, Login, and Signup.

Lab changes:

- Added routes:
  - `/contests/detail/:id/posts`
  - `/posts/:id`
  - `/profile/:id`
  - `/users/:id`
  - `/titles/:id`

Reason:

- Enable tournament post lists, post details, other user profiles, and title detail navigation.

Related features:

- P0-11/P0-12.
- Post detail.
- Title detail.

Frontend reference value:

- High for routing.

Lab-only caution:

- Route names are reference only; align with team routing conventions before adopting.

### Frontend `hackason-frontend/src/pages/Contest.jsx`

Baseline role:

- Displayed active/upcoming/finished tournament tabs.
- Used current contest list and joined contests.
- Result tab contained dummy/fallback values including fake winners and `999` rank fallback.

Lab changes:

- Connects result tab to `GET /tournaments/results/summary`.
- Removes fake winners and fake rank fallback.
- Displays real user title winners, real joined count, real title count, and real best rank.

Reason:

- Make result screen safe to show as reference implementation without dummy data.

Related features:

- Result display.
- Title awards.
- P0-11/P0-12 visibility context.

Frontend reference value:

- Medium-high. Use it for data flow, but redesign can still be owned by frontend/design.

Lab-only caution:

- Result tab layout is not final UX.

### Frontend `hackason-frontend/src/pages/ContestDetail.jsx` and CSS

Baseline role:

- Displayed tournament detail, participation state, ranking, and submissions.
- Join action navigated into post flow.
- Did not show title award image or admin finalize.

Lab changes:

- Shows title image for the tournament.
- Shows evaluation method, AI evaluation status, ranking with formatted scores, and current user rank.
- Adds direct join/cancel and record posting actions for active tournaments.
- Adds admin-only finalize button.
- Hides participate/post actions after finish.
- Shows finished/finalized tournaments as read-only.

Reason:

- Validate the core MVP experience from detail -> participate -> post -> ranking -> title.

Related features:

- P0-10.
- Ranking.
- Finalize.
- Admin/user.
- Finished tournament blocking.

Frontend reference value:

- Very high for P0-10 and tournament flow.

Lab-only caution:

- Visual design is Lab validation UI, not final Figma-approved design.

### Frontend `hackason-frontend/src/pages/Post.jsx` and CSS

Baseline role:

- Post creation UI for commitment and tournament posts.

Lab changes:

- Adds submit lock to prevent duplicate post/record creation.
- Supports image/video media selection and upload.
- Supports max 5 media items and video duration validation.
- Handles objective tournament records and AI tournament media requirements separately.
- For tournament posts, joins tournament, creates post, creates record for objective tournaments, then returns to tournament detail/ranking.
- Lists only active, non-finalized tournaments for tournament posting.
- Blocks submit if selected tournament is finished/finalized.
- Stops tournament posts from sending `#大会` as a commitment tag.

Reason:

- Make tournament submission safe and connect it to records/ranking.

Related features:

- P0 posting.
- Image/video posting.
- Tournament-record linkage.
- Finished tournament blocking.
- AI evaluation foundation.

Frontend reference value:

- Very high for posting flow.

Lab-only caution:

- AI provider is not connected; AI tournament flow is a reference shell.

### Frontend `hackason-frontend/src/pages/Profile.jsx` and CSS

Baseline role:

- Displayed profile basics and user posts.

Lab changes:

- Loads user titles, featured title, and recent records.
- Shows acquired title images.
- Supports own and other profile routes.
- Links title cards to title detail.

Reason:

- Validate P0-11 and P0-12.

Related features:

- P0-11 own profile acquired title images.
- P0-12 other profile acquired title images.

Frontend reference value:

- Very high for title display patterns.

Lab-only caution:

- Future title equipping UX is not final.

### Frontend `hackason-frontend/src/pages/TitleDetail.jsx` and CSS

Baseline role:

- This file did not exist in the baseline.

Lab change:

- Added title detail page.

Reason:

- Allow users to inspect image-first title evidence: title image, tournament, rank, record, awardee, and awarded date.

Related features:

- P0-11/P0-12.
- Representative title.

Frontend reference value:

- High.

Lab-only caution:

- Future title presentation/animation should be designed with frontend/design.

### Frontend `hackason-frontend/src/pages/PostDetail.jsx` and CSS

Baseline role:

- Displayed post detail.

Lab changes:

- Adds media carousel-style display.
- Adds like/comment interactions.
- Shows AI evaluation state when available.

Reason:

- Support post review after tournament or AI submission.

Related features:

- P1 post detail, comments, likes.
- AI evaluation UX.

Frontend reference value:

- Medium.

Lab-only caution:

- Comment/like UX is supporting behavior, not the core VIVORA value.

### Frontend `hackason-frontend/src/components/PostCard.jsx` and CSS

Baseline role:

- Rendered post cards in feeds.

Lab changes:

- Uses `likedByMe`, likes, comments, media preview, and tournament links.
- Shows tournament posts as tournament badges instead of commitment tags.
- Links user/profile and post detail.

Reason:

- Make feed cards work with real post API and avoid `#大会` as a fake commitment tag.

Related features:

- Home feed.
- Post detail.
- Tournament post linkage.

Frontend reference value:

- Medium.

Lab-only caution:

- Feed/recommendation behavior is not final product UX.

### Frontend `hackason-frontend/src/services/api.js`

Baseline role:

- Frontend API wrapper and data normalization.

Lab changes:

- Adds access token handling.
- Adds Supabase Storage media upload.
- Adds tournament, ranking, result summary, title, featured title, records, comments, likes, recommendations, and evaluation API wrappers.
- Normalizes score precision, title fields, role, status, and media fields.
- Treats `result_finalized_at` as finished.

Reason:

- Centralize Lab API contract for frontend pages.

Related features:

- Most P0/P1 Lab features.

Frontend reference value:

- Very high. Start here when wiring frontend to backend.

Lab-only caution:

- `API_BASE_URL` is hardcoded to `http://localhost:3000`; adapt before team integration.

### Other Changed Frontend Files

Files:

- `hackason-frontend/src/pages/Discover.jsx`
- `hackason-frontend/src/pages/Discover.css`
- `hackason-frontend/src/pages/Login.jsx`
- `hackason-frontend/src/pages/Login.css`
- `hackason-frontend/src/pages/Signup.jsx`
- `hackason-frontend/src/pages/TagDetail.jsx`
- `hackason-frontend/eslint.config.js`
- `hackason-frontend/package.json`
- `hackason-frontend/package-lock.json`

Lab changes:

- Discovery page shows recommended tournaments and commitment posts.
- Login/signup handle access-token based auth flow.
- Tag detail and eslint/package files were adjusted to support current Lab build/lint behavior.

Reason:

- Support surrounding flows needed to validate MVP behavior in a browser.

Frontend reference value:

- Medium to low, except auth pages if the team wants to compare login/signup UX.

Lab-only caution:

- Recommendations are a rule-based Lab feature, not final recommendation strategy.

## B. New Files Added In The Lab

### Database And Migrations

Files:

- `backend/supabase-schema.sql`
- `backend/manual-migrations/001_ai_evaluation_foundation.sql`
- `backend/manual-migrations/002_title_identity_and_tournament_series.sql`
- `backend/manual-migrations/003_constrain_evaluation_statuses.sql`
- `backend/manual-migrations/004_admin_role_and_user_grants.sql`

Purpose:

- Define the full Lab schema and incremental manual migrations for existing Lab Supabase environments.

Major tables/fields:

- `users.role`
- `posts.media`
- `tournaments.decimal_places`
- `tournaments.direction`
- `tournaments.evaluation_type`
- `tournaments.result_finalized_at`
- `tournament_participants`
- `records`
- `titles`
- `user_titles`
- `user_featured_titles`
- `submission_evaluations`
- `tournament_series`

Frontend reference value:

- High for understanding API field availability.

Lab-only caution:

- RLS OFF and broad Lab GRANTs are explicitly not production security.

### Backend Routes

Files:

- `backend/routes/records.js`
- `backend/routes/evaluations.js`
- `backend/routes/recommendations.js`
- `backend/routes/tournamentSeries.js`

Purpose:

- Move records out of in-memory storage.
- Add AI evaluation state.
- Add lightweight tournament recommendations.
- Add tournament series foundation.

Frontend reference value:

- `records.js` and `evaluations.js`: high.
- `recommendations.js` and `tournamentSeries.js`: medium/experimental.

Lab-only caution:

- AI provider is not connected.
- Tournament series UX is incomplete.

### Backend Utilities

Files:

- `backend/utils/admin.js`
- `backend/utils/evaluation.js`
- `backend/utils/ranking.js`
- `backend/utils/resultSummary.js`
- `backend/utils/titleAwards.js`
- `backend/utils/tournamentStatus.js`

Purpose:

- Keep ranking, status, title award, evaluation, admin, and result summary rules testable outside route handlers.

Frontend reference value:

- High for understanding behavior and edge cases.

Lab-only caution:

- These are reference implementations. Production may need transaction boundaries, queues, and stricter authorization.

### Backend Tests

Files:

- `backend/tests/admin.test.js`
- `backend/tests/evaluation.test.js`
- `backend/tests/ranking.test.js`
- `backend/tests/resultSummary.test.js`
- `backend/tests/titleAwards.test.js`
- `backend/tests/tournamentStatus.test.js`

Purpose:

- Cover admin/finalize permission logic, AI evaluation status, ranking directions, title award idempotency, result summary empties, and finished/finalized tournament blocking.

Frontend reference value:

- Medium. Useful as executable documentation for frontend expectations.

Lab-only caution:

- They are unit-style tests, not full browser E2E.

### Frontend Pages

Files:

- `hackason-frontend/src/pages/TitleDetail.jsx`
- `hackason-frontend/src/pages/TitleDetail.css`

Purpose:

- Show image-first title details and awardee profile linkage.

Frontend reference value:

- High for title/tournament submission references.

Lab-only caution:

- Final visual design should be coordinated with frontend/design.

## Change Summary By Theme

### Authentication And Users

- Baseline had auth routes and public user lookup.
- Lab connects access tokens to backend mutations through `authenticateUser`.
- Lab uses `public.users.user_id` as the app user ID.
- Lab adds `role` for admin/user distinction.

### Tournament Flow

- Baseline had simple tournament CRUD and participation with body `userId`.
- Lab uses authenticated participation, participant counts from `tournament_participants`, status, finished/finalized blocking, related posts, ranking, title images, and finalize.

### Posts And Media

- Baseline posts were simpler and user identity could be sent from frontend.
- Lab posts use authenticated user identity and support media upload metadata.
- Tournament posts no longer create commitment tags such as `#大会`.

### Records And Ranking

- Baseline ranking used `posts.record`.
- Lab ranking uses `records` as the canonical score source.
- Supports `highest`, `lowest`, `closest`, best-per-user, ties, and decimal display precision.

### Titles

- Baseline had no complete image-title flow.
- Lab adds `titles`, `user_titles`, `user_featured_titles`, title detail, profile display, and finalize-award flow.

### AI Evaluation

- Lab adds `submission_evaluations`.
- AI evaluation stores process and reasoning.
- Completed AI scores sync into `records`.
- Real AI provider integration is not complete.

### Future Foundations

- Tournament recommendations and tournament series exist as Lab foundations.
- These are not final product features.
