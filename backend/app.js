const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const challengeRoutes = require("./routes/challenges");
const dummyRoutes = require("./routes/dummy");
const tournamentRoutes = require("./routes/tournaments");
const tagsRoutes = require("./routes/tags");
require("dotenv").config();

const app = express();
const PORT = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
app.use("/challenges", challengeRoutes);
app.use("/dummy", dummyRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/tags", tagsRoutes);

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

// 記録送信API（現状はメモリ保存）
const records = [
  {
    id: 1,
    userId: 1,
    tournamentId: 1,
    score: 35.2
  }
];

app.post("/record", (req, res) => {
  const { userId, tournamentId, score } = req.body;

  const newRecord = {
    id: records.length + 1,
    userId,
    tournamentId,
    score
  };

  records.push(newRecord);
  return res.json(newRecord);
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

