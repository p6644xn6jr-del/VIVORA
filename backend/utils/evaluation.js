const EVALUATION_TYPES = ["objective", "ai", "human_vote"];
const EVALUATION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "not_configured",
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

function hasImageMedia(post) {
  const media = Array.isArray(post?.media) ? post.media : [];

  return media.some((item) => item?.mediaType === "image" && item?.mediaUrl);
}

function evaluateSubmission({ tournament, post, record }) {
  const evaluationType = normalizeEvaluationType(tournament?.evaluation_type);
  const provider = tournament?.evaluation_provider ?? "none";
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

    if (!process.env.VIVORA_AI_PROVIDER) {
      return {
        evaluationType,
        status: "not_configured",
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
      status: "failed",
      provider: process.env.VIVORA_AI_PROVIDER,
      version,
      score: null,
      feedback: null,
      errorCode: "AI_PROVIDER_UNSUPPORTED",
      errorMessage: "設定済みAI providerの実装がまだありません。",
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

module.exports = {
  EVALUATION_STATUSES,
  EVALUATION_TYPES,
  evaluateSubmission,
  normalizeEvaluationStatus,
  normalizeEvaluationType,
  validateEvaluationScore,
};
