const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const recordsRoutes = require("./routes/records");
const challengeRoutes = require("./routes/challenges");
const dummyRoutes = require("./routes/dummy");
const tournamentRoutes = require("./routes/tournaments");
const tagsRoutes = require("./routes/tags");
const evaluationRoutes = require("./routes/evaluations");
const recommendationRoutes = require("./routes/recommendations");
const authenticateUser = require("./middleware/auth");
const { buildRanking } = require("./utils/ranking");
const { getTournamentStatus } = require("./utils/tournamentStatus");
require("dotenv").config();

const app = express();
const PORT = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function countTournamentParticipants(tournamentId, fallback = 0) {
  const { count, error } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) throw error;

  return count ?? Number(fallback ?? 0);
}

async function getTournamentRanking(tournament) {
  const { data: records, error } = await supabase
    .from("records")
    .select("*, users(display_name, icon_url), posts(image_url, media, content)")
    .eq("tournament_id", tournament.id);

  if (error) throw error;

  return buildRanking(records ?? [], tournament);
}

app.use(express.json({ limit: "10mb" }));

// CORS: Vite/Reactのローカル開発からAPIを呼べるようにする。
// 本番化するときは許可Originを絞る。
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);
app.use("/records", recordsRoutes);
app.use("/challenges", challengeRoutes);
app.use("/dummy", dummyRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/tags", tagsRoutes);
app.use("/evaluations", evaluationRoutes);
app.use("/recommendations", recommendationRoutes);

// ホーム
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ランキングAPI（現状は仮データ）
app.get("/ranking", (req, res) => {
  res.json([
    { name: "テスト太郎", score: 100 },
    { name: "テスト花子", score: 80 }
  ]);
});

// 旧フロント互換: /signup と /login
// 詳細な認証処理は /auth 側に統一。
app.post("/signup", async (req, res) => {
  const {
    email,
    password,
    name,
    username,
    birthday,
    age_visibility,
    ageVisibility,
    area,
    icon_url,
    iconUrl,
    profile
  } = req.body;

  return authRoutes.handleSignup(
    {
      body: {
        email,
        password,
        name: name ?? username,
        birthday,
        age_visibility: age_visibility ?? ageVisibility,
        area,
        icon_url: icon_url ?? iconUrl,
        profile
      }
    },
    res
  );
});

app.post("/login", async (req, res) => {
  return authRoutes.handleLogin(req, res);
});

// ユーザー一覧取得API
app.get("/users", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, email, area, icon_url, birthday, age_visibility, bio, is_private, favorite_genres, created_at");

  if (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return res.status(500).json({
      message: "ユーザー一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data.map((user) => ({
    id: user.user_id,
    name: user.display_name,
    email: user.email,
    area: user.area,
    icon: user.icon_url || "🙂",
    birthday: user.birthday,
    ageVisibility: user.age_visibility,
    bio: user.bio,
    isPrivate: user.is_private,
    favoriteGenres: user.favorite_genres,
    createdAt: user.created_at
  })));
});

app.get("/users/:id/titles", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "ユーザーIDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("user_titles")
    .select("*, titles(*), tournaments(title, image_url), records(score, unit)")
    .eq("user_id", id)
    .order("awarded_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "称号一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json((data ?? []).map((item) => ({
    id: item.id,
    titleId: item.title_id,
    userId: item.user_id,
    tournamentId: item.tournament_id,
    tournamentTitle: item.tournaments?.title ?? "",
    name: item.titles?.name ?? "称号",
    description: item.titles?.description ?? "",
    imageUrl: item.titles?.image_url ?? "",
    rarity: item.titles?.rarity ?? "winner",
    recordId: item.record_id,
    score: item.records?.score ?? null,
    unit: item.records?.unit ?? "",
    rank: item.rank,
    awardedAt: item.awarded_at
  })));
});

app.get("/me/titles", authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from("user_titles")
    .select("*, titles(*), tournaments(title, image_url), records(score, unit)")
    .eq("user_id", req.userId)
    .order("awarded_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "称号一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json((data ?? []).map((item) => ({
    id: item.id,
    titleId: item.title_id,
    userId: item.user_id,
    tournamentId: item.tournament_id,
    tournamentTitle: item.tournaments?.title ?? "",
    name: item.titles?.name ?? "称号",
    description: item.titles?.description ?? "",
    imageUrl: item.titles?.image_url ?? "",
    rarity: item.titles?.rarity ?? "winner",
    recordId: item.record_id,
    score: item.records?.score ?? null,
    unit: item.records?.unit ?? "",
    rank: item.rank,
    awardedAt: item.awarded_at
  })));
});

app.get("/user-titles/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "称号IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("user_titles")
    .select("*, titles(*), tournaments(title, image_url), records(score, unit)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      message: "称号詳細の取得に失敗しました",
      error: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      message: "称号が見つかりません"
    });
  }

  return res.json({
    id: data.id,
    titleId: data.title_id,
    userId: data.user_id,
    tournamentId: data.tournament_id,
    tournamentTitle: data.tournaments?.title ?? "",
    name: data.titles?.name ?? "称号",
    description: data.titles?.description ?? "",
    imageUrl: data.titles?.image_url ?? "",
    rarity: data.titles?.rarity ?? "winner",
    recordId: data.record_id,
    score: data.records?.score ?? null,
    unit: data.records?.unit ?? "",
    rank: data.rank,
    awardedAt: data.awarded_at
  });
});

app.get("/users/:id/featured-title", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "ユーザーIDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("user_titles")
    .select("*, titles(*), tournaments(title, image_url)")
    .eq("user_id", id)
    .order("awarded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      message: "代表称号の取得に失敗しました",
      error: error.message
    });
  }

  if (!data) {
    return res.json(null);
  }

  return res.json({
    userId: data.user_id,
    userTitleId: data.id,
    titleId: data.title_id,
    tournamentId: data.tournament_id,
    tournamentTitle: data.tournaments?.title ?? "",
    titleName: data.titles?.name ?? "称号",
    titleImageUrl: data.titles?.image_url ?? "",
    awardedAt: data.awarded_at,
    rank: data.rank
  });
});

app.get("/users/:id/records", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "ユーザーIDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("records")
    .select("*, tournaments(title, unit, target, direction, decimal_places)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "記録一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data ?? []);
});

app.get("/users/:id/tournaments", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "ユーザーIDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("*, tournaments(*)")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "参加大会一覧の取得に失敗しました",
      error: error.message
    });
  }

  try {
    const joinedTournaments = await Promise.all(
      (data ?? []).map(async (item) => {
        const tournament = item.tournaments;
        const participantsCount = await countTournamentParticipants(
          tournament.id,
          tournament.participants
        );
        const ranking = await getTournamentRanking(tournament);
        const myRanking = ranking.find(
          (rankItem) => Number(rankItem.userId) === id
        );

        return {
          ...tournament,
          status: getTournamentStatus(tournament),
          participants: participantsCount,
          participantsCount,
          joinedAt: item.created_at,
          myRank: myRanking?.rank ?? null,
          myBestScore: myRanking?.scoreText ?? null,
          myBestRecordId: myRanking?.recordId ?? null,
        };
      })
    );

    return res.json(joinedTournaments);
  } catch (detailError) {
    return res.status(500).json({
      message: "参加大会詳細の取得に失敗しました",
      error: detailError.message
    });
  }
});

// ユーザー取得API（DBのuser_idを使用）
app.get("/user/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "ユーザーIDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, email, area, icon_url, birthday, age_visibility, bio, is_private, favorite_genres, created_at")
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    console.error("ユーザー取得エラー:", error);
    return res.status(500).json({
      message: "ユーザー取得に失敗しました",
      error: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      message: "ユーザーが見つかりません"
    });
  }

  return res.json({
    id: data.user_id,
    name: data.display_name,
    email: data.email,
    area: data.area,
    icon: data.icon_url || "🙂",
    birthday: data.birthday,
    ageVisibility: data.age_visibility,
    bio: data.bio,
    isPrivate: data.is_private,
    favoriteGenres: data.favorite_genres,
    createdAt: data.created_at
  });
});

// 旧URL互換: 実処理は /records に統一。
app.post("/record", authenticateUser, async (req, res, next) => {
  req.url = "/";
  return recordsRoutes(req, res, next);
});

// Supabase接続テスト
app.get("/test", async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error) {
    return res.status(500).json(error);
  }

  return res.json(data);
});

// 404
app.use((req, res) => {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// エラーハンドラ
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "サーバー内部エラー",
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
