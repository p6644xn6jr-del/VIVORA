const assert = require("node:assert/strict");
const test = require("node:test");
const {
  evaluateSubmission,
  getFirstImageMedia,
  shouldReuseExistingEvaluation,
  toCompletedAiEvaluation,
  validateEvaluationScore,
} = require("../utils/evaluation");

test("objective evaluation completes from canonical record score", () => {
  const result = evaluateSubmission({
    tournament: { evaluation_type: "objective", evaluation_version: "v1" },
    post: { id: 1, media: [] },
    record: { score: 12 },
  });

  assert.equal(result.status, "completed");
  assert.equal(result.score, 12);
  assert.equal(result.provider, "objective");
});

test("AI evaluation requires image media", () => {
  const result = evaluateSubmission({
    tournament: { evaluation_type: "ai", evaluation_provider: "openai" },
    post: { id: 1, media: [{ mediaType: "video", mediaUrl: "https://example.test/a.mp4" }] },
    record: null,
  });

  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "AI_IMAGE_MEDIA_REQUIRED");
});

test("AI evaluation is not fake-successful when provider is not configured", () => {
  const previousProvider = process.env.VIVORA_AI_PROVIDER;
  delete process.env.VIVORA_AI_PROVIDER;

  const result = evaluateSubmission({
    tournament: { evaluation_type: "ai", evaluation_provider: "openai" },
    post: { id: 1, media: [{ mediaType: "image", mediaUrl: "https://example.test/a.png" }] },
    record: null,
  });

  if (previousProvider == null) {
    delete process.env.VIVORA_AI_PROVIDER;
  } else {
    process.env.VIVORA_AI_PROVIDER = previousProvider;
  }

  assert.equal(result.status, "failed");
  assert.equal(result.score, null);
  assert.equal(result.errorCode, "AI_PROVIDER_NOT_CONFIGURED");
});

test("AI evaluation enters processing when provider is configured", () => {
  const previousProvider = process.env.VIVORA_AI_PROVIDER;
  process.env.VIVORA_AI_PROVIDER = "openai";

  const result = evaluateSubmission({
    tournament: { evaluation_type: "ai", evaluation_provider: "openai" },
    post: { id: 1, media: [{ mediaType: "image", mediaUrl: "https://example.test/a.png" }] },
    record: null,
  });

  if (previousProvider == null) {
    delete process.env.VIVORA_AI_PROVIDER;
  } else {
    process.env.VIVORA_AI_PROVIDER = previousProvider;
  }

  assert.equal(result.status, "processing");
  assert.equal(result.provider, "openai");
  assert.equal(result.score, null);
});

test("AI evaluation uses the first image media as the target", () => {
  const firstImage = { mediaType: "image", mediaUrl: "https://example.test/first.png" };
  const secondImage = { mediaType: "image", mediaUrl: "https://example.test/second.png" };

  assert.deepEqual(
    getFirstImageMedia({
      media: [
        { mediaType: "video", mediaUrl: "https://example.test/video.mp4" },
        firstImage,
        secondImage,
      ],
    }),
    firstImage
  );
});

test("completed and processing evaluations are reused without provider calls", () => {
  assert.equal(shouldReuseExistingEvaluation({ status: "completed" }), true);
  assert.equal(shouldReuseExistingEvaluation({ status: "processing" }), true);
  assert.equal(shouldReuseExistingEvaluation({ status: "failed" }), false);
  assert.equal(shouldReuseExistingEvaluation({ status: "pending" }), false);
});

test("completed AI evaluation keeps provider metadata for records sync", () => {
  const result = toCompletedAiEvaluation({
    tournament: { evaluation_version: "v1" },
    post: { media: [{ mediaType: "image", mediaUrl: "https://example.test/a.png" }] },
    providerResult: {
      provider: "openai",
      model: "gpt-test",
      score: 91,
      feedback: "三角形としてよく整っています。",
      breakdown: [],
      responseId: "resp_test",
      usage: { total_tokens: 20 },
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(result.score, 91);
  assert.equal(result.provider, "openai");
  assert.equal(result.metadata.model, "gpt-test");
  assert.equal(result.metadata.selectedImageMedia.mediaUrl, "https://example.test/a.png");
});

test("evaluation score is validated against tournament score bounds", () => {
  const tournament = { ai_score_min: 0, ai_score_max: 100 };

  assert.equal(validateEvaluationScore(87, tournament), true);
  assert.equal(validateEvaluationScore(101, tournament), false);
  assert.equal(validateEvaluationScore(-1, tournament), false);
});
