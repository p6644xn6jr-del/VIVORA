const assert = require("node:assert/strict");
const test = require("node:test");
const {
  evaluateSubmission,
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

  assert.equal(result.status, "not_configured");
  assert.equal(result.score, null);
  assert.equal(result.errorCode, "AI_PROVIDER_NOT_CONFIGURED");
});

test("evaluation score is validated against tournament score bounds", () => {
  const tournament = { ai_score_min: 0, ai_score_max: 100 };

  assert.equal(validateEvaluationScore(87, tournament), true);
  assert.equal(validateEvaluationScore(101, tournament), false);
  assert.equal(validateEvaluationScore(-1, tournament), false);
});
