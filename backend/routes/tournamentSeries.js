const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { getTournamentStatus } = require("../utils/tournamentStatus");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("tournament_series")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "大会シリーズ一覧の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(data ?? []);
});

router.get("/:id/tournaments", async (req, res) => {
  const seriesId = Number(req.params.id);

  if (!Number.isInteger(seriesId)) {
    return res.status(400).json({ message: "シリーズIDが不正です" });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("series_id", seriesId)
    .order("start_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "シリーズ大会一覧の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(
    (data ?? []).map((tournament) => ({
      ...tournament,
      status: getTournamentStatus(tournament),
    }))
  );
});

module.exports = router;
