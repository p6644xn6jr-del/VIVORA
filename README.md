# VIVORA Lab

VIVORA Lab is a personal verification repository created from the team baseline commit:

```text
8961adb Initial VIVORA baseline
```

It is not the team production repository and is not a replacement for team implementation. The purpose of this Lab is to make MVP behavior concrete, verify UX and API contracts, and provide reference implementations that PM/design/frontend members can inspect before deciding what to bring back to the team codebase.

## Important Safety Notice

This repository is connected only to the dedicated VIVORA Lab environment.

Do not apply this Lab schema or configuration directly to the team Supabase or production Supabase.

The current Lab database policy is intentionally permissive for local validation:

```text
application tables: RLS OFF
Lab Data API GRANTs: anon/authenticated
Backend table client: SUPABASE_ANON_KEY
```

This is not a production security model. A production design should use server-only credentials and/or authenticated JWT based RLS policies. Do not write `.env` values, API keys, service role keys, or secrets into this README or any document.

## Relationship To The Team Version

- `origin/main` points to the personal GitHub repository `p6644xn6jr-del/VIVORA`.
- The baseline `8961adb` is the copied starting point from the team code.
- Commits after `8961adb` are Lab-only reference and verification work.
- The Lab exists to help the team compare concrete behavior, not to overwrite teammates' work.

## Directory Structure

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

Create `.env` files locally as needed. Do not commit or paste their values.

Backend expected environment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Frontend expected environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Optional AI provider environment is intentionally not configured in this Lab by default.

## Run Backend

```sh
cd backend
npm install
npm run dev
```

Default API origin:

```text
http://localhost:3000
```

## Run Frontend

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

Use only the dedicated VIVORA Lab Supabase project.

For a new empty Lab Supabase, start from:

```text
backend/supabase-schema.sql
```

For an existing Lab Supabase that already has the earlier schema, apply manual migrations in order as needed:

```text
backend/manual-migrations/001_ai_evaluation_foundation.sql
backend/manual-migrations/002_title_identity_and_tournament_series.sql
backend/manual-migrations/003_constrain_evaluation_statuses.sql
backend/manual-migrations/004_admin_role_and_user_grants.sql
```

Storage buckets used by the Lab:

- `post-media`: public media for post image/video uploads.
- `title-images`: public title/badge image display.

## Implemented Lab Features

The following are implemented as Lab reference behavior after `8961adb..HEAD`:

- Supabase Auth signup/login using access tokens.
- Public user profile mapping from `auth.users.id` to `public.users.id`.
- Tournament list/detail from Supabase.
- Tournament participation with authenticated user, duplicate participation protection, and real participant counts.
- Tournament post flow with image/video media upload and max 5 media files.
- `records` table as the canonical score source for ranking.
- Ranking by `highest`, `lowest`, and `closest`, with best record per user and tie handling.
- Tournament result finalization and winner title awarding.
- Image-first titles:
  - P0-10: title image visible on tournament detail.
  - P0-11: own acquired title images visible on profile.
  - P0-12: other users' acquired title images visible on profile.
- Title detail page with image, tournament, rank, score, awardee, award date, and profile link.
- Featured title selection for a user's representative title.
- Admin/user role foundation.
- Admin-only tournament finalization.
- Finished/finalized tournaments are read-only for new participation, tournament posts, and records.
- Post comments, likes, post detail, and tag-based discovery.
- Tournament recommendations.
- Tournament series foundation.
- AI evaluation foundation.

## Records Are The Canonical Ranking Source

Objective tournaments and AI tournaments are both designed to rank from `records`.

Current intended flow:

```text
post
submission_evaluations = pending/processing/completed/failed
AI score and reasoning stored in submission_evaluations
completed AI score reflected into records
records used for best-per-user ranking
ranking used for titles
```

`submission_evaluations` stores evaluation process and reasoning. It should not become a second canonical ranking table.

## AI Evaluation Status

The Lab has the schema, route, and UI foundation for AI evaluation, but no real external AI provider is connected.

Current behavior:

- Objective evaluation can complete from numeric records.
- AI evaluation requires image media.
- Without a configured provider, AI evaluation fails explicitly with an error code rather than producing a fake score.
- Completed AI evaluations are intended to sync final scores into `records`.

## Admin And User

The Lab uses `public.users.role`:

```text
user
admin
```

New users default to `user`. `manual-migrations/004_admin_role_and_user_grants.sql` sets Lab user `user_id = 1` as admin after human confirmation that this row is Shion Watanabe.

Admin can finalize tournament results. General users cannot see the finalize button and receive `403` if they call the finalize API directly.

Because Lab app tables use RLS OFF, this is a reference implementation and not final production security.

## Future Work Is Not Complete

These areas are intentionally only foundations or experiments:

- Real AI provider integration.
- Production-grade AI evaluation queue/workers.
- Tournament series product UX.
- Advanced title/badge UX such as title equip slots, title animations, notification feed, or Proseka-style title customization.
- Production Supabase security hardening.

See:

- `docs/CHANGES_FROM_BASELINE.md`
- `docs/FRONTEND_REFERENCE.md`
