const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 大会一覧
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({
      message: "大会一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data);
});

// 大会作成
router.post("/", async (req, res) => {
  const {
    title,
    category,
    participants,
    description,
    rule,
    start_at,
    end_at,
    created_by,
    official,
    image_url,
    type,
    target,
    unit,
    direction,
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({
      message: "title と category は必須です"
    });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert([
      {
        title,
        category,
        participants: participants ?? 0,
        description,
        rule,
        start_at,
        end_at,
        created_by,
        official: official ?? false,
        image_url,
        type,
        target,
        unit,
        direction,
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: "大会の登録に失敗しました",
      error: error.message
    });
  }

  return res.status(201).json(data);
});

// 大会詳細
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      message: "大会詳細の取得に失敗しました",
      error: error.message
    });
  }

  if (!data) {
    return res.status(404).json({
      message: "大会が見つかりません"
    });
  }

  return res.json(data);
});

// 大会参加登録
router.post("/:id/participants", async (req, res) => {
  const tournamentId = Number(req.params.id);
  const { userId } = req.body;

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  if (!userId) {
    return res.status(400).json({
      message: "userIdが必要です"
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert([
      {
        tournament_id: tournamentId,
        user_id: userId
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("参加登録エラー:", error);

    return res.status(500).json({
      message: "大会への参加登録に失敗しました",
      error: error.message
    });
  }

  return res.status(201).json(data);
});

// 大会参加キャンセル
router.delete("/:id/participants", async (req, res) => {
  const tournamentId = Number(req.params.id);
  const { userId } = req.body;

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  if (!userId) {
    return res.status(400).json({
      message: "userIdが必要です"
    });
  }

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);

  if (error) {
    console.error("参加キャンセルエラー:", error);
    return res.status(500).json({
      message: "大会参加のキャンセルに失敗しました",
      error: error.message
    });
  }

  return res.json({
    message: "大会の参加をキャンセルしました"
  });
});

// 大会参加者一覧
router.get("/:id/participants", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("参加者一覧取得エラー:", error);
    return res.status(500).json({
      message: "参加者一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data);
});

// 大会ごとのランキング取得API
router.get("/:id/ranking", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です"
    });
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("tournament_id", tournamentId)
    .not("record", "is", null);

  if (error) {
    return res.status(500).json({
      message: "ランキングの取得に失敗しました",
      error: error.message
    });
  }

  const ranking = [...posts]
    .sort((a, b) => Number(b.record) - Number(a.record))
    .map((post, index) => ({
      rank: index + 1,
      userId: post.user_id,
      score: Number(post.record)
    }));

  return res.json(ranking);
});

module.exports = router;
