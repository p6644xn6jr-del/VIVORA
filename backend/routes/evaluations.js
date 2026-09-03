const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");
const {
  evaluateSubmission,
  validateEvaluationScore,
} = require("../utils/evaluation");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function toEvaluationPayload(evaluation, tournament, post, record = null) {
  return {
    tournament_id: tournament.id,
    post_id: post.id,
    record_id: record?.id ?? null,
    user_id: post.user_id,
    evaluation_type: evaluation.evaluationType,
    status: evaluation.status,
    provider: evaluation.provider,
    version: evaluation.version,
    score: evaluation.score,
    feedback: evaluation.feedback,
    criteria: tournament.ai_criteria ?? null,
    error_code: evaluation.errorCode,
    error_message: evaluation.errorMessage,
    metadata: {
      media: Array.isArray(post.media) ? post.media : [],
      tournamentTitle: tournament.title,
    },
    evaluated_at:
      evaluation.status === "completed" || evaluation.status === "failed"
        ? new Date().toISOString()
        : null,
  };
}

async function syncCompletedEvaluationRecord(evaluation, tournament, post, existingRecord) {
  if (evaluation.status !== "completed") {
    return existingRecord ?? null;
  }

  if (!validateEvaluationScore(evaluation.score, tournament)) {
    throw new Error("評価スコアが大会の範囲外です");
  }

  if (existingRecord?.id) {
    const { data, error } = await supabase
      .from("records")
      .update({
        score: Number(evaluation.score),
        unit: tournament.unit ?? null,
        verified: true,
      })
      .eq("id", existingRecord.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("records")
    .insert([
      {
        tournament_id: tournament.id,
        user_id: post.user_id,
        post_id: post.id,
        score: Number(evaluation.score),
        unit: tournament.unit ?? null,
        verified: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

router.get("/posts/:postId", async (req, res) => {
  const postId = Number(req.params.postId);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: "投稿IDが不正です" });
  }

  const { data, error } = await supabase
    .from("submission_evaluations")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      message: "評価結果の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(data ?? null);
});

router.get("/tournaments/:tournamentId", async (req, res) => {
  const tournamentId = Number(req.params.tournamentId);

  if (!Number.isInteger(tournamentId)) {
    return res.status(400).json({ message: "大会IDが不正です" });
  }

  const { data, error } = await supabase
    .from("submission_evaluations")
    .select("*, users(display_name, icon_url), posts(content, image_url, media)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: "大会評価一覧の取得に失敗しました",
      error: error.message,
    });
  }

  return res.json(data ?? []);
});

router.post("/posts/:postId", authenticateUser, async (req, res) => {
  const postId = Number(req.params.postId);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: "投稿IDが不正です" });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*, tournaments(*)")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return res.status(500).json({
      message: "投稿の取得に失敗しました",
      error: postError.message,
    });
  }

  if (!post) {
    return res.status(404).json({ message: "投稿が見つかりません" });
  }

  if (Number(post.user_id) !== Number(req.userId)) {
    return res.status(403).json({ message: "自分の投稿だけ評価できます" });
  }

  if (!post.tournaments) {
    return res.status(400).json({ message: "大会投稿ではありません" });
  }

  const { data: record } = await supabase
    .from("records")
    .select("*")
    .eq("post_id", postId)
    .maybeSingle();

  try {
    const evaluation = evaluateSubmission({
      tournament: post.tournaments,
      post,
      record,
    });
    const payload = toEvaluationPayload(evaluation, post.tournaments, post, record);
    const syncedRecord = await syncCompletedEvaluationRecord(
      evaluation,
      post.tournaments,
      post,
      record
    );

    const { data, error } = await supabase
      .from("submission_evaluations")
      .upsert(
        [
          {
            ...payload,
            record_id: syncedRecord?.id ?? payload.record_id,
          }
        ],
        { onConflict: "post_id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    const statusCode =
      data.status === "completed" || data.status === "failed" ? 200 : 202;

    return res.status(statusCode).json({
      message:
        data.status === "completed"
          ? "評価が完了しました"
          : "評価状態を保存しました",
      evaluation: data,
    });
  } catch (error) {
    return res.status(500).json({
      message: "評価結果の保存に失敗しました",
      error: error.message,
    });
  }
});

module.exports = router;
