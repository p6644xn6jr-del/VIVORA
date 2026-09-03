const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");
const { getTournamentStatus } = require("../utils/tournamentStatus");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.get("/tournaments", authenticateUser, async (req, res) => {
  const [{ data: user }, { data: tournaments, error }, { data: joined }] =
    await Promise.all([
      supabase
        .from("users")
        .select("favorite_genres")
        .eq("user_id", req.userId)
        .maybeSingle(),
      supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("tournament_participants")
        .select("tournament_id")
        .eq("user_id", req.userId),
    ]);

  if (error) {
    return res.status(500).json({
      message: "おすすめ大会の取得に失敗しました",
      error: error.message,
    });
  }

  const favoriteGenres = new Set(
    (Array.isArray(user?.favorite_genres) ? user.favorite_genres : [])
      .map((genre) => String(genre).toLowerCase())
  );
  const joinedIds = new Set((joined ?? []).map((item) => Number(item.tournament_id)));

  const recommendations = (tournaments ?? [])
    .filter((tournament) => getTournamentStatus(tournament) !== "finished")
    .map((tournament) => {
      let score = 0;
      const category = String(tournament.category ?? "").toLowerCase();

      if (favoriteGenres.has(category)) score += 30;
      if (!joinedIds.has(Number(tournament.id))) score += 20;
      if (tournament.official) score += 10;
      if ((tournament.evaluation_type ?? "objective") === "ai") score += 8;

      return {
        ...tournament,
        status: getTournamentStatus(tournament),
        recommendationScore: score,
        recommendationReason:
          score >= 30
            ? "あなたの興味に近い大会です"
            : joinedIds.has(Number(tournament.id))
              ? "参加中の大会です"
              : "まだ参加していない大会です",
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 6);

  return res.json(recommendations);
});

module.exports = router;
