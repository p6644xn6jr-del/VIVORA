# Changes From Baseline

Baseline:

```text
8961adb Initial VIVORA baseline
```

この資料は、以下の実際のGit diffを根拠にしています。

```sh
git diff --name-status 8961adb..HEAD
git diff --stat 8961adb..HEAD
```

この資料作成時点で、handoff documents追加前のLab実装差分は、51 files changed、5591 insertions、280 deletionsでした。

## A. Existing Baseline Files Changed

baselineに存在していたファイルを、Labで変更したものです。フロント担当が比較するときは、この章を優先して読むと「元のチームコードから何が変わったか」を追いやすいです。

### `backend/app.js`

Baseline role:

- Express app setup。
- auth、posts、challenges、dummy、tournaments、tags routesのmount。
- `/users`、`/user/:id`、legacy `/signup`、legacy `/login`。
- in-memoryな`/record` endpointとtemporaryな`/ranking` endpoint。

Lab changes:

- `records`、`evaluations`、`recommendations`、`tournament-series` routesをmount。
- legacy `/record` behaviorをreal records routeへ接続。
- user title APIsを追加。
  - `GET /users/:id/titles`
  - `GET /me/titles`
  - `GET /user-titles/:id`
  - `GET /users/:id/featured-title`
  - `PUT /me/featured-title`
- user responseにrole normalizationを追加。
- title records用に`scoreText` formattingを追加。

Reason:

- Profile/title MVP behaviorを具体化し、titlesをreal users、tournaments、recordsへ接続するため。

Related features:

- P0-11 own profile title images。
- P0-12 other profile title images。
- Representative title。
- records canonical ranking。

Frontend reference value:

- 高いです。title/profile integrationのresponse shape確認に使えます。

Lab-only caution:

- `SUPABASE_ANON_KEY`経由の広いLab Data API accessを前提にしています。本番securityではありません。

### `backend/middleware/auth.js`

Baseline role:

- Supabase access tokenをverify。
- `public.users.user_id`をlookup。
- `req.authUser`と`req.userId`を設定。

Lab changes:

- public user profile全体をselect。
- `req.user`、`req.userId`、`req.userRole`を設定。
- unknown roleを`user`へnormalize。

Reason:

- Backend routesでauthenticated public user identityとadmin/user roleが必要になったため。

Related features:

- Admin-only finalize。
- User-owned featured title update。

Frontend reference value:

- 中程度です。frontendが`Authorization: Bearer <access_token>`を送る理由の理解に使えます。

Lab-only caution:

- roleはLab用reference designです。本番ではRLS/server-only controlsでrole writeを強化してください。

### `backend/routes/tournaments.js`

Baseline role:

- Supabaseからtournamentsをlist。
- body-provided `created_by`でtournament作成。
- body-provided `userId`でjoin/cancel participation。
- `posts.record`からrankingを作成。

Lab changes:

- tournament creation、join、cancel、finalizeにauthenticationを要求。
- `req.userId`を使用し、frontendからjoin/finalize用のuserIdを送らない。
- `tournament_participants`からparticipants countを算出。
- `getTournamentStatus`によるreal statusを追加。
- `GET /tournaments/popular`を追加。
- `GET /tournaments/results/summary`を追加。
- `GET /tournaments/:id/title`を追加。
- `GET /tournaments/:id/ranking`を`records` sourceに変更。
- `POST /tournaments/:id/finalize`を追加。
- 同率rank-1の全userへtitlesを付与。
- `finished`または`result_finalized_at`後のnew participationをblock。

Reason:

- tournament discoveryからparticipation、ranking、finalization、title awardまでのMVP flowを成立させるため。

Related features:

- P0 tournament list/detail/participation。
- P0-10 title image on tournament detail。
- Ranking。
- Title award。
- Admin/user。
- Finished tournament read-only behavior。

Frontend reference value:

- 非常に高いです。frontend側のmain tournament contractです。

Lab-only caution:

- finalizeはLab admin workflow用です。本番ではより強いadmin modelが必要です。

### `backend/routes/posts.js`

Baseline role:

- request bodyの`userId`でpostsを作成。
- 全post typeでtagsを必須扱い。
- simple post fieldsを保存。

Lab changes:

- create/like/comment mutationsにaccess tokenを要求。
- authenticated `req.userId`を使用。
- max 5件のimage/video itemsを持つ`media` JSONをsupport。
- `tournament_id`付きのtournament postsをsupport。
- tournament postsではempty tagsを許可し、commitment tagsを汚さないように変更。
- tournament finish/finalize後のtournament post creationをblock。
- likes、likedByMe、comments count、comment endpointsを追加。

Reason:

- postsをuser-ownedにし、mediaとtournament submissionsをdummy user IDなしで接続するため。

Related features:

- P0 posting。
- P0 image/video posting。
- Tournament-post linkage。
- Likes/comments P1。
- Finished tournament read-only behavior。

Frontend reference value:

- 高いです。`Post.jsx`、`PostCard.jsx`、post detailの接続確認に使えます。

Lab-only caution:

- Storage uploadはfrontendがanon keyとauthenticated JWTで直接行います。本番ではpolicy設計を見直してください。

### `backend/routes/tags.js`

Baseline role:

- `posts.tags`からtagsをaggregate。

Lab changes:

- default `こだわり`を除外。
- `大会`を除外。
- tournament postsをpopular commitment tagsから除外。

Reason:

- tournament activityがHomeのcommitment tag areaに`#大会`として出ないようにするため。

Related features:

- Home feed。
- Discover。

Frontend reference value:

- 中程度です。Home popular tag behaviorの理解に使えます。

Lab-only caution:

- tag UXは軽量なLab実装であり、final product taxonomyではありません。

### `backend/package.json`

Baseline role:

- Backend package metadataとdependencies。

Lab changes:

- Lab testsを実行するためのscript supportを追加/調整。

Reason:

- ranking、status、title awards、admin、result summary、AI evaluation logicを`node --test`で確認するため。

Frontend reference value:

- 低いです。

Lab-only caution:

- package metadataの文言をproduct directionとして扱わないでください。

### Frontend `hackason-frontend/src/App.jsx`

Baseline role:

- Home、Discover、Contest、ContestDetail、JoinedContests、Post、Notifications、Profile、TagDetail、Login、Signupのcore routesを登録。

Lab changes:

- routesを追加。
  - `/contests/detail/:id/posts`
  - `/posts/:id`
  - `/profile/:id`
  - `/users/:id`
  - `/titles/:id`

Reason:

- tournament post lists、post details、other user profiles、title detail navigationを有効にするため。

Related features:

- P0-11/P0-12。
- Post detail。
- Title detail。

Frontend reference value:

- 高いです。routing確認に使えます。

Lab-only caution:

- route namesはreferenceです。チーム版へ導入する場合はteam routing conventionsに合わせてください。

### Frontend `hackason-frontend/src/pages/Contest.jsx`

Baseline role:

- active/upcoming/finished tournament tabsを表示。
- current contest listとjoined contestsを使用。
- Result tabにはfake winnersや`999` rank fallbackを含むdummy/fallback valuesがありました。

Lab changes:

- Result tabを`GET /tournaments/results/summary`へ接続。
- fake winnersとfake rank fallbackを削除。
- real user title winners、real joined count、real title count、real best rankを表示。

Reason:

- dummy dataなしでreference implementationとして見せられるresult screenにするため。

Related features:

- Result display。
- Title awards。
- P0-11/P0-12 visibility context。

Frontend reference value:

- 中から高です。data flowは参考になりますが、visual redesignはfrontend/designの担当でよいです。

Lab-only caution:

- Result tab layoutはfinal UXではありません。

### Frontend `hackason-frontend/src/pages/ContestDetail.jsx` and CSS

Baseline role:

- tournament detail、participation state、ranking、submissionsを表示。
- join actionからpost flowへ遷移。
- title award imageやadmin finalizeは未表示。

Lab changes:

- tournamentに紐づくtitle imageを表示。
- evaluation method、AI evaluation status、formatted scores付きranking、current user rankを表示。
- active tournaments向けにdirect join/cancelとrecord posting actionsを追加。
- admin-only finalize buttonを追加。
- finish後はparticipate/post actionsを隠す。
- finished/finalized tournamentsをread-only表示にする。

Reason:

- detail -> participate -> post -> ranking -> titleのcore MVP experienceを検証するため。

Related features:

- P0-10。
- Ranking。
- Finalize。
- Admin/user。
- Finished tournament blocking。

Frontend reference value:

- 非常に高いです。P0-10とtournament flowの中心です。

Lab-only caution:

- visual designはLab validation UIであり、final Figma-approved designではありません。

### Frontend `hackason-frontend/src/pages/Post.jsx` and CSS

Baseline role:

- commitment postsとtournament posts用のpost creation UI。

Lab changes:

- duplicate post/record creationを防ぐsubmit lockを追加。
- image/video media selectionとuploadをsupport。
- max 5 media itemsとvideo duration validationをsupport。
- objective tournament recordsとAI tournament media requirementsを分岐。
- tournament postsではjoin、post作成、objective tournamentsのrecord作成を行い、成功後にtournament detail/rankingへ戻す。
- activeかつnon-finalized tournamentsだけをtournament posting候補として表示。
- selected tournamentがfinished/finalizedの場合、submit前にもblock。
- tournament postsが`#大会`をcommitment tagとして送らないように変更。

Reason:

- tournament submissionを安全にし、records/rankingへ接続するため。

Related features:

- P0 posting。
- Image/video posting。
- Tournament-record linkage。
- Finished tournament blocking。
- AI evaluation foundation。

Frontend reference value:

- 非常に高いです。posting flowの参考になります。

Lab-only caution:

- AI providerは未接続です。AI tournament flowはreference shellです。

### Frontend `hackason-frontend/src/pages/Profile.jsx` and CSS

Baseline role:

- profile basicsとuser postsを表示。

Lab changes:

- user titles、featured title、recent recordsをload。
- acquired title imagesを表示。
- own profileとother profile routesをsupport。
- title cardsからtitle detailへlink。

Reason:

- P0-11とP0-12を検証するため。

Related features:

- P0-11 own profile acquired title images。
- P0-12 other profile acquired title images。

Frontend reference value:

- 非常に高いです。title display patternの参考になります。

Lab-only caution:

- Future title equipping UXはfinalではありません。

### Frontend `hackason-frontend/src/pages/TitleDetail.jsx` and CSS

Baseline role:

- baselineには存在しないfileです。

Lab change:

- title detail pageを追加。

Reason:

- image-first title evidenceとして、title image、tournament、rank、record、awardee、awarded dateを確認できるようにするため。

Related features:

- P0-11/P0-12。
- Representative title。

Frontend reference value:

- 高いです。

Lab-only caution:

- Future title presentation/animationはfrontend/designと相談して決めてください。

### Frontend `hackason-frontend/src/pages/PostDetail.jsx` and CSS

Baseline role:

- post detailを表示。

Lab changes:

- media carousel-style displayを追加。
- like/comment interactionsを追加。
- availableな場合にAI evaluation stateを表示。

Reason:

- tournament submissionやAI submissionの投稿確認を支えるため。

Related features:

- P1 post detail、comments、likes。
- AI evaluation UX。

Frontend reference value:

- 中程度です。

Lab-only caution:

- Comment/like UXはsupporting behaviorであり、VIVORA core valueではありません。

### Frontend `hackason-frontend/src/components/PostCard.jsx` and CSS

Baseline role:

- feeds内のpost cardsをrender。

Lab changes:

- `likedByMe`、likes、comments、media preview、tournament linksを使用。
- tournament postsをcommitment tagsではなくtournament badgesとして表示。
- user/profileとpost detailへlink。

Reason:

- real post APIと連携し、`#大会`をfake commitment tagとして出さないため。

Related features:

- Home feed。
- Post detail。
- Tournament post linkage。

Frontend reference value:

- 中程度です。

Lab-only caution:

- Feed/recommendation behaviorはfinal product UXではありません。

### Frontend `hackason-frontend/src/services/api.js`

Baseline role:

- Frontend API wrapperとdata normalization。

Lab changes:

- access token handlingを追加。
- Supabase Storage media uploadを追加。
- tournament、ranking、result summary、title、featured title、records、comments、likes、recommendations、evaluation API wrappersを追加。
- score precision、title fields、role、status、media fieldsをnormalize。
- `result_finalized_at`をfinished扱いにする。

Reason:

- frontend pagesから使うLab API contractを集約するため。

Related features:

- ほぼすべてのP0/P1 Lab features。

Frontend reference value:

- 非常に高いです。frontendがbackendに接続するときは最初に見るべきfileです。

Lab-only caution:

- `API_BASE_URL`は`http://localhost:3000`にhardcodedです。チーム統合時は調整してください。

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

- Discovery pageでrecommended tournamentsとcommitment postsを表示。
- Login/signupがaccess-token based auth flowを扱うように調整。
- Tag detailとeslint/package filesを、現在のLab build/lint behaviorに合わせて調整。

Reason:

- MVP behaviorをbrowserで検証するために必要な周辺flowを支えるため。

Frontend reference value:

- 中から低です。ただしteamがlogin/signup UXを比較したい場合、auth pagesは参考になります。

Lab-only caution:

- Recommendationsはrule-based Lab featureであり、final recommendation strategyではありません。

## B. New Files Added In The Lab

Labで新規追加したファイルです。baselineには存在しなかったため、チーム版へ持ち込む場合は責務や設計を比較してから判断してください。

### Database And Migrations

Files:

- `backend/supabase-schema.sql`
- `backend/manual-migrations/001_ai_evaluation_foundation.sql`
- `backend/manual-migrations/002_title_identity_and_tournament_series.sql`
- `backend/manual-migrations/003_constrain_evaluation_statuses.sql`
- `backend/manual-migrations/004_admin_role_and_user_grants.sql`

Purpose:

- full Lab schemaと、既存Lab Supabase向けのincremental manual migrationsを定義します。

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

- 高いです。APIで利用できるfieldsを理解するために使えます。

Lab-only caution:

- RLS OFFと広いLab GRANTsは、本番securityではありません。

### Backend Routes

Files:

- `backend/routes/records.js`
- `backend/routes/evaluations.js`
- `backend/routes/recommendations.js`
- `backend/routes/tournamentSeries.js`

Purpose:

- recordsをin-memory storageから切り離します。
- AI evaluation stateを追加します。
- lightweight tournament recommendationsを追加します。
- tournament series foundationを追加します。

Frontend reference value:

- `records.js`と`evaluations.js`: 高いです。
- `recommendations.js`と`tournamentSeries.js`: 中程度/experimentalです。

Lab-only caution:

- AI providerは未接続です。
- Tournament series UXは未完成です。

### Backend Utilities

Files:

- `backend/utils/admin.js`
- `backend/utils/evaluation.js`
- `backend/utils/ranking.js`
- `backend/utils/resultSummary.js`
- `backend/utils/titleAwards.js`
- `backend/utils/tournamentStatus.js`

Purpose:

- ranking、status、title award、evaluation、admin、result summary rulesをroute handlersから切り出し、testしやすくしています。

Frontend reference value:

- 高いです。behaviorとedge casesの理解に使えます。

Lab-only caution:

- reference implementationです。本番ではtransaction boundaries、queues、stricter authorizationが必要になる可能性があります。

### Backend Tests

Files:

- `backend/tests/admin.test.js`
- `backend/tests/evaluation.test.js`
- `backend/tests/ranking.test.js`
- `backend/tests/resultSummary.test.js`
- `backend/tests/titleAwards.test.js`
- `backend/tests/tournamentStatus.test.js`

Purpose:

- admin/finalize permission logic、AI evaluation status、ranking directions、title award idempotency、result summary empties、finished/finalized tournament blockingをcoverします。

Frontend reference value:

- 中程度です。frontend expectationsを確認するexecutable documentationとして使えます。

Lab-only caution:

- unit-style testsであり、full browser E2Eではありません。

### Frontend Pages

Files:

- `hackason-frontend/src/pages/TitleDetail.jsx`
- `hackason-frontend/src/pages/TitleDetail.css`

Purpose:

- image-first title detailsとawardee profile linkageを表示します。

Frontend reference value:

- title/tournament submission referencesとして高いです。

Lab-only caution:

- final visual designはfrontend/designと調整してください。

## Change Summary By Theme

### Authentication And Users

- baselineにはauth routesとpublic user lookupがありました。
- Labでは`authenticateUser`を通じてaccess tokensをbackend mutationsへ接続しました。
- Labではapp user IDとして`public.users.user_id`を使います。
- Labではadmin/user distinction用に`role`を追加しました。

### Tournament Flow

- baselineにはsimple tournament CRUDと、body `userId`によるparticipationがありました。
- Labではauthenticated participation、`tournament_participants`由来のparticipants count、status、finished/finalized blocking、related posts、ranking、title images、finalizeを追加しました。

### Posts And Media

- baseline postsはよりsimpleで、user identityをfrontendから送れる構造でした。
- Lab postsはauthenticated user identityを使い、media upload metadataをsupportします。
- Tournament postsでは`#大会`のようなcommitment tagsを作らないようにしました。

### Records And Ranking

- baseline rankingは`posts.record`を使っていました。
- Lab rankingは`records`をcanonical score sourceとして使います。
- `highest`、`lowest`、`closest`、best-per-user、ties、decimal display precisionをsupportします。

### Titles

- baselineにはcomplete image-title flowはありませんでした。
- Labでは`titles`、`user_titles`、`user_featured_titles`、title detail、profile display、finalize-award flowを追加しました。

### AI Evaluation

- Labでは`submission_evaluations`を追加しました。
- AI evaluationはprocessとreasoningを保存します。
- Completed AI scoresは`records`へsyncします。
- Real AI provider integrationは未完成です。

### Future Foundations

- Tournament recommendationsとtournament seriesはLab foundationとして存在します。
- これらはfinal product featuresではありません。
