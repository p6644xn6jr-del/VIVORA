const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");
const { resolveEvaluationProvider } = require("../providers/evaluationProviderResolver");
const {
  evaluateSubmission,
  getConfiguredAiProvider,
  getFirstImageMedia,
  shouldReuseExistingEvaluation,
  toCompletedAiEvaluation,
  toFailedEvaluation,
  validateEvaluationScore,
} = require("../utils/evaluation");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function mergeEvaluationMetadata(evaluation, tournament, post) {
  return {
    ...(evaluation.metadata ?? {}),
    media: Array.isArray(post.media) ? post.media : [],
    tournamentTitle: tournament.title,
    evaluationVersion: tournament.evaluation_version ?? evaluation.version,
  };
}

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
    metadata: mergeEvaluationMetadata(evaluation, tournament, post),
    evaluated_at:
      evaluation.status === "completed" || evaluation.status === "failed"
        ? new Date().toISOString()
        : null,
  };
}

function toProcessingEvaluation(tournament, post, providerName) {
  return {
    evaluationType: "ai",
    status: "processing",
    provider: providerName,
    version: tournament.evaluation_version ?? "v1",
    score: null,
    feedback: null,
    errorCode: null,
    errorMessage: null,
    metadata: {
      selectedImageMedia: getFirstImageMedia(post),
    },
  };
}

async function saveEvaluation(payload) {
  const { data, error } = await supabase
    .from("submission_evaluations")
    .upsert([payload], { onConflict: "post_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getExistingEvaluation(postId) {
  const { data, error } = await supabase
    .from("submission_evaluations")
    .select("*")
    .eq("post_id", postId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function startProcessingEvaluation(payload, existingEvaluation = null) {
  if (existingEvaluation?.id) {
    const { data, error } = await supabase
      .from("submission_evaluations")
      .update({
        record_id: payload.record_id,
        status: payload.status,
        provider: payload.provider,
        version: payload.version,
        score: null,
        feedback: null,
        criteria: payload.criteria,
        error_code: null,
        error_message: null,
        metadata: payload.metadata,
        evaluated_at: null,
      })
      .eq("id", existingEvaluation.id)
      .select()
      .single();

    if (error) throw error;
    return { evaluation: data, reused: false };
  }

  const { data, error } = await supabase
    .from("submission_evaluations")
    .insert([payload])
    .select()
    .single();

  if (error?.code === "23505") {
    return {
      evaluation: await getExistingEvaluation(payload.post_id),
      reused: true,
    };
  }

  if (error) throw error;
  return { evaluation: data, reused: false };
}

async function updateEvaluation(evaluationId, evaluation, tournament, post, record = null) {
  const payload = toEvaluationPayload(evaluation, tournament, post, record);
  const { data, error } = await supabase
    .from("submission_evaluations")
    .update({
      record_id: payload.record_id,
      status: payload.status,
      provider: payload.provider,
      version: payload.version,
      score: payload.score,
      feedback: payload.feedback,
      criteria: payload.criteria,
      error_code: payload.error_code,
      error_message: payload.error_message,
      metadata: payload.metadata,
      evaluated_at: payload.evaluated_at,
    })
    .eq("id", evaluationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function syncCompletedEvaluationRecord(evaluation, tournament, post, existingRecord) {
  if (evaluation.status !== "completed") {
    return null;
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

async function attachEvaluationRecord(evaluationId, recordId) {
  if (!recordId) return null;

  const { data, error } = await supabase
    .from("submission_evaluations")
    .update({ record_id: recordId })
    .eq("id", evaluationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function getEvaluationResponseMessage(status) {
  if (status === "completed") return "評価が完了しました";
  if (status === "processing") return "評価中です";
  if (status === "failed") return "評価に失敗しました";
  return "評価状態を保存しました";
}

async function handleObjectiveEvaluation(post, record) {
  const evaluation = evaluateSubmission({
    tournament: post.tournaments,
    post,
    record,
  });
  const savedEvaluation = await saveEvaluation(
    toEvaluationPayload(evaluation, post.tournaments, post, record)
  );
  const syncedRecord = await syncCompletedEvaluationRecord(
    evaluation,
    post.tournaments,
    post,
    record
  );

  return syncedRecord?.id
    ? attachEvaluationRecord(savedEvaluation.id, syncedRecord.id)
    : savedEvaluation;
}

async function handleAiEvaluation(post, record, existingEvaluation = null) {
  const validationResult = evaluateSubmission({
    tournament: post.tournaments,
    post,
    record,
  });

  if (validationResult.status === "failed") {
    return saveEvaluation(
      toEvaluationPayload(validationResult, post.tournaments, post, record)
    );
  }

  const providerName = getConfiguredAiProvider();
  const provider = resolveEvaluationProvider(providerName);

  if (!provider) {
    const failedEvaluation = toFailedEvaluation({
      tournament: post.tournaments,
      post,
      provider: providerName,
      errorCode: providerName
        ? "AI_PROVIDER_UNSUPPORTED"
        : "AI_PROVIDER_NOT_CONFIGURED",
      errorMessage: providerName
        ? "設定済みAI providerは未対応です。"
        : "AI評価providerが未設定です。",
    });

    return saveEvaluation(
      toEvaluationPayload(failedEvaluation, post.tournaments, post, record)
    );
  }

  const processingEvaluation = toProcessingEvaluation(
    post.tournaments,
    post,
    provider.name
  );
  const processingResult = await startProcessingEvaluation(
    toEvaluationPayload(processingEvaluation, post.tournaments, post, record),
    existingEvaluation
  );

  if (processingResult.reused && shouldReuseExistingEvaluation(processingResult.evaluation)) {
    return processingResult.evaluation;
  }

  const processingRow = processingResult.evaluation;
  if (!processingRow?.id) {
    throw new Error("評価処理状態を保存できませんでした");
  }

  let finalEvaluation;

  try {
    const providerResult = await provider.evaluate({
      tournament: post.tournaments,
      post,
      imageMedia: getFirstImageMedia(post),
    });

    finalEvaluation = toCompletedAiEvaluation({
      tournament: post.tournaments,
      post,
      providerResult,
    });

    if (!validateEvaluationScore(finalEvaluation.score, post.tournaments)) {
      finalEvaluation = toFailedEvaluation({
        tournament: post.tournaments,
        post,
        provider: provider.name,
        errorCode: "AI_SCORE_OUT_OF_RANGE",
        errorMessage: "AI評価スコアが大会の範囲外です。",
        metadata: {
          model: providerResult.model,
          breakdown: providerResult.breakdown,
          responseId: providerResult.responseId,
          usage: providerResult.usage,
        },
      });
    }
  } catch (error) {
    console.error("AI provider evaluation failed:", {
  code: error?.code ?? "AI_PROVIDER_ERROR",
  message: error?.message,
  provider: provider.name,
  cause: error?.cause
    ? {
        status: error.cause?.status ?? null,
        code: error.cause?.code ?? null,
        type: error.cause?.type ?? null,
        message: error.cause?.message ?? null,
      }
    : null,
});

    finalEvaluation = toFailedEvaluation({
      tournament: post.tournaments,
      post,
      provider: provider.name,
      errorCode: error?.code ?? "AI_PROVIDER_ERROR",
      errorMessage:
        error?.code === "OPENAI_API_KEY_MISSING"
          ? "OpenAI API keyが未設定です。"
          : "AI評価providerでエラーが発生しました。",
    });
  }

  const savedEvaluation = await updateEvaluation(
    processingRow.id,
    finalEvaluation,
    post.tournaments,
    post,
    record
  );
  const syncedRecord = await syncCompletedEvaluationRecord(
    finalEvaluation,
    post.tournaments,
    post,
    record
  );

  return syncedRecord?.id
    ? attachEvaluationRecord(savedEvaluation.id, syncedRecord.id)
    : savedEvaluation;
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

  let existingEvaluation = null;

  try {
    existingEvaluation = await getExistingEvaluation(postId);
  } catch (error) {
    return res.status(500).json({
      message: "評価状態の取得に失敗しました",
      error: error.message,
    });
  }

  if (shouldReuseExistingEvaluation(existingEvaluation)) {
    return res
      .status(existingEvaluation.status === "processing" ? 202 : 200)
      .json({
        message: getEvaluationResponseMessage(existingEvaluation.status),
        evaluation: existingEvaluation,
      });
  }

  const { data: record } = await supabase
    .from("records")
    .select("*")
    .eq("post_id", postId)
    .maybeSingle();

  try {
    const data =
      post.tournaments.evaluation_type === "ai"
        ? await handleAiEvaluation(post, record, existingEvaluation)
        : await handleObjectiveEvaluation(post, record);

    return res
      .status(data.status === "processing" ? 202 : 200)
      .json({
        message: getEvaluationResponseMessage(data.status),
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
