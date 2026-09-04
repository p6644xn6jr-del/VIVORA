const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");
const {
  getTournamentClosedMessage,
  isTournamentClosed,
} = require("../utils/tournamentStatus");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post("/", authenticateUser, async (req, res) => {
  const { tournamentId, postId, score, unit } = req.body;
  const tournament_id = Number(tournamentId);
  const post_id = postId == null ? null : Number(postId);
  const numericScore = Number(score);

  if (!Number.isInteger(tournament_id)) {
    return res.status(400).json({ message: "大会IDが不正です" });
  }

  if (!Number.isFinite(numericScore)) {
    return res.status(400).json({ message: "記録を数値で入力してください" });
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournament_id)
    .maybeSingle();

  if (tournamentError) {
    return res.status(500).json({
      message: "大会情報の取得に失敗しました",
      error: tournamentError.message,
    });
  }

  if (!tournament) {
    return res.status(404).json({ message: "大会が見つかりません" });
  }

  if (isTournamentClosed(tournament)) {
    return res.status(409).json({
      message: getTournamentClosedMessage(tournament),
    });
  }

  const { data, error } = await supabase
    .from("records")
    .insert([
      {
        tournament_id,
        user_id: req.userId,
        post_id,
        score: numericScore,
        unit: unit ?? null,
        verified: false,
      },
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: "記録の保存に失敗しました",
      error: error.message,
    });
  }

  return res.status(201).json({ message: "記録を保存しました", record: data });
});

router.get("/me", authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from("records")
    .select("*, tournaments(title, unit, direction, target, decimal_places)")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "自分の記録の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(data ?? []);
});

router.get("/", async (req, res) => {
  const tournamentId = Number(req.query.tournamentId);
  const userId = Number(req.query.userId);

  let query = supabase
    .from("records")
    .select("*, users(display_name, icon_url), posts(image_url, media, content)")
    .order("created_at", { ascending: false });

  if (Number.isInteger(tournamentId)) {
    query = query.eq("tournament_id", tournamentId);
  }

  if (Number.isInteger(userId)) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      message: "記録一覧の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(data ?? []);
});

module.exports = router;
