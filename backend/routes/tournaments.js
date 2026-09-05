const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authenticateUser = require("../middleware/auth");

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
      error: error.message,
    });
  }

  return res.json(data ?? []);
});

// 人気の大会取得（参加人数順）
router.get("/popular", async (req, res) => {
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*");

  if (error) {
    console.error("大会一覧取得エラー:", error);
    return res.status(500).json({
      message: "大会一覧の取得に失敗しました",
      error: error.message,
    });
  }

  const tournamentsWithCount = await Promise.all(
    (tournaments ?? []).map(async (tournament) => {
      const { count, error: countError } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);

      if (countError) {
        console.error("参加人数取得エラー:", countError);
        return {
          ...tournament,
          participantsCount: 0,
        };
      }

      return {
        ...tournament,
        participantsCount: count ?? 0,
      };
    })
  );

  tournamentsWithCount.sort(
    (a, b) => b.participantsCount - a.participantsCount
  );

  return res.json(tournamentsWithCount);
});

// 大会作成
router.post("/", authenticateUser, async (req, res) => {
  const {
    title,
    category,
    description,
    rule,
    start_at,
    end_at,
    official,
    image_url,
    type,
    target,
    unit,
    direction,
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({
      message: "title と category は必須です",
    });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert([
      {
        title,
        category,
        participants: 0,
        description,
        rule,
        start_at,
        end_at,
        created_by: req.userId,
        official: official ?? false,
        image_url,
        type,
        target,
        unit,
        direction,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: "大会の登録に失敗しました",
      error: error.message,
    });
  }

  return res.status(201).json({
    message: "大会を作成しました",
    tournament: data,
  });
});

// 大会参加
router.post("/:id/participants", authenticateUser, async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です",
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .insert([
      {
        tournament_id: tournamentId,
        user_id: req.userId,
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "すでにこの大会に参加しています",
      });
    }

    console.error("参加登録エラー:", error);
    return res.status(500).json({
      message: "大会への参加登録に失敗しました",
      error: error.message,
    });
  }

  return res.status(201).json({
    message: "大会に参加しました",
    participant: data,
  });
});

// 大会参加キャンセル
router.delete("/:id/participants", authenticateUser, async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です",
    });
  }

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", req.userId);

  if (error) {
    console.error("参加キャンセルエラー:", error);
    return res.status(500).json({
      message: "大会参加のキャンセルに失敗しました",
      error: error.message,
    });
  }

  return res.status(200).json({
    message: "大会の参加をキャンセルしました",
  });
});

// 大会参加者一覧
router.get("/:id/participants", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です",
    });
  }

  const { data, error } = await supabase
    .from("tournament_participants")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "参加者一覧の取得に失敗しました",
      error: error.message,
    });
  }

  return res.status(200).json(data ?? []);
});

// 大会ごとのランキング取得
router.get("/:id/ranking", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です",
    });
  }

  const { data: records, error } = await supabase
    .from("records")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (error) {
    return res.status(500).json({
      message: "ランキングの取得に失敗しました",
      error: error.message,
    });
  }

  const ranking = [...(records ?? [])]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((record, index) => ({
      rank: index + 1,
      userId: record.user_id,
      score: Number(record.score),
      verified: record.verified,
    }));

  return res.status(200).json(ranking);
});

// 大会詳細取得
router.get("/:id", async (req, res) => {
  const tournamentId = Number(req.params.id);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({
      message: "大会IDが不正です",
    });
  }

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament) {
    return res.status(404).json({
      message: "大会が見つかりません",
    });
  }

  const { count, error: countError } = await supabase
    .from("tournament_participants")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("tournament_id", tournamentId);

  if (countError) {
    return res.status(500).json({
      message: "参加人数の取得に失敗しました",
      error: countError.message,
    });
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (postsError) {
    return res.status(500).json({
      message: "大会投稿の取得に失敗しました",
      error: postsError.message,
    });
  }

  // ログインしている場合だけ現在のユーザーを取得
  let currentUserId = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.split(" ")[1];

    const {
      data: { user },
    } = await supabase.auth.getUser(accessToken);

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("user_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        currentUserId = profile.user_id;
      }
    }
  }

  let joinedByMe = false;
  let createdByMe = false;

  if (currentUserId) {
    const { data: participation } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    joinedByMe = !!participation;
    createdByMe = String(tournament.created_by) === String(currentUserId);
  }

  return res.status(200).json({
    ...tournament,
    participantsCount: count || 0,
    joinedByMe,
    createdByMe,
    posts: posts ?? [],
  });
});

module.exports = router;
