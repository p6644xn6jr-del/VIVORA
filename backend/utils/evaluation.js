const EVALUATION_TYPES = ["objective", "ai", "human_vote"];
const EVALUATION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
];

function normalizeEvaluationType(type) {
  return EVALUATION_TYPES.includes(type) ? type : "objective";
}

function normalizeEvaluationStatus(status) {
  return EVALUATION_STATUSES.includes(status) ? status : "pending";
}

function getScoreBounds(tournament) {
  const min = Number(tournament?.ai_score_min ?? 0);
  const max = Number(tournament?.ai_score_max ?? 100);

  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 100,
  };
}

function validateEvaluationScore(score, tournament) {
  const numericScore = Number(score);
  const { min, max } = getScoreBounds(tournament);

  return (
    Number.isFinite(numericScore) &&
    numericScore >= min &&
    numericScore <= max
  );
}

function getFirstImageMedia(post) {
  const media = Array.isArray(post?.media) ? post.media : [];

  return media.find((item) => item?.mediaType === "image" && item?.mediaUrl) ?? null;
}

function hasImageMedia(post) {
  return Boolean(getFirstImageMedia(post));
}

function getConfiguredAiProvider(env = process.env) {
  return env.VIVORA_AI_PROVIDER || null;
}

function evaluateSubmission({ tournament, post, record }) {
  const evaluationType = normalizeEvaluationType(tournament?.evaluation_type);
  const configuredProvider = getConfiguredAiProvider();
  const provider = configuredProvider ?? tournament?.evaluation_provider ?? "none";
  const version = tournament?.evaluation_version ?? "v1";

  if (evaluationType === "objective") {
    const score = Number(record?.score ?? post?.record);

    if (!Number.isFinite(score)) {
      return {
        evaluationType,
        status: "failed",
        provider: "objective",
        version,
        score: null,
        feedback: null,
        errorCode: "OBJECTIVE_SCORE_MISSING",
        errorMessage: "数値記録がないため評価できません。",
      };
    }

    return {
      evaluationType,
      status: "completed",
      provider: "objective",
      version,
      score,
      feedback: "投稿された数値記録を大会ルールに基づいて評価しました。",
      errorCode: null,
      errorMessage: null,
    };
  }

  if (evaluationType === "ai") {
    if (!hasImageMedia(post)) {
      return {
        evaluationType,
        status: "failed",
        provider,
        version,
        score: null,
        feedback: null,
        errorCode: "AI_IMAGE_MEDIA_REQUIRED",
        errorMessage: "AI評価には画像メディアが必要です。",
      };
    }

    if (!configuredProvider) {
      return {
        evaluationType,
        status: "failed",
        provider,
        version,
        score: null,
        feedback: null,
        errorCode: "AI_PROVIDER_NOT_CONFIGURED",
        errorMessage: "AI評価providerが未設定です。",
      };
    }

    return {
      evaluationType,
      status: "processing",
      provider: configuredProvider,
      version,
      score: null,
      feedback: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    evaluationType,
    status: "pending",
    provider: "human_vote",
    version,
    score: null,
    feedback: null,
    errorCode: "HUMAN_VOTE_NOT_IMPLEMENTED",
    errorMessage: "投票型評価は今後実装予定です。",
  };
}

function shouldReuseExistingEvaluation(evaluation) {
  return ["completed", "processing"].includes(evaluation?.status);
}

function toFailedEvaluation({
  tournament,
  post,
  provider,
  errorCode,
  errorMessage,
  metadata = {},
}) {
  return {
    evaluationType: normalizeEvaluationType(tournament?.evaluation_type),
    status: "failed",
    provider: provider ?? tournament?.evaluation_provider ?? "none",
    version: tournament?.evaluation_version ?? "v1",
    score: null,
    feedback: null,
    errorCode,
    errorMessage,
    metadata: {
      ...metadata,
      selectedImageMedia: getFirstImageMedia(post),
    },
  };
}

function toCompletedAiEvaluation({ tournament, post, providerResult }) {
  return {
    evaluationType: "ai",
    status: "completed",
    provider: providerResult.provider,
    version: tournament?.evaluation_version ?? "v1",
    score: Number(providerResult.score),
    feedback: providerResult.feedback,
    errorCode: null,
    errorMessage: null,
    metadata: {
      model: providerResult.model,
      breakdown: providerResult.breakdown,
      responseId: providerResult.responseId,
      usage: providerResult.usage,
      selectedImageMedia: getFirstImageMedia(post),
      evaluationVersion: tournament?.evaluation_version ?? "v1",
    },
  };
}

module.exports = {
  EVALUATION_STATUSES,
  EVALUATION_TYPES,
  evaluateSubmission,
  getConfiguredAiProvider,
  getFirstImageMedia,
  hasImageMedia,
  normalizeEvaluationStatus,
  normalizeEvaluationType,
  shouldReuseExistingEvaluation,
  toCompletedAiEvaluation,
  toFailedEvaluation,
  validateEvaluationScore,
};
