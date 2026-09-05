const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildPrompt,
  evaluateWithOpenAI,
  evaluationJsonSchema,
  getOpenAIConfig,
} = require("../providers/openaiEvaluationProvider");

const tournament = {
  title: "おにぎり三角形王",
  ai_criteria: "左右対称性：40点\n三辺のバランス：30点\n頂点の明確さ：30点",
  ai_score_min: 0,
  ai_score_max: 100,
  evaluation_version: "v1",
};
const imageMedia = {
  mediaType: "image",
  mediaUrl: "https://example.test/onigiri.png",
};

test("OpenAI config reads model from env with a safe default", () => {
  assert.equal(getOpenAIConfig({ OPENAI_API_KEY: "test" }).model, "gpt-5.6-luna");
  assert.equal(
    getOpenAIConfig({
      OPENAI_API_KEY: "test",
      OPENAI_MODEL: "custom-model",
    }).model,
    "custom-model"
  );
});

test("OpenAI prompt is built from fixed tournament criteria and first image", () => {
  const prompt = buildPrompt({ tournament, imageMedia });

  assert.match(prompt, /おにぎり三角形王/);
  assert.match(prompt, /左右対称性：40点/);
  assert.match(prompt, /三辺のバランス：30点/);
  assert.match(prompt, /頂点の明確さ：30点/);
  assert.match(prompt, /先頭image 1枚のみ/);
  assert.match(prompt, /score range: 0 to 100/);
  assert.match(prompt, /投稿者を推測して評価しない/);
});

test("OpenAI provider uses Responses structured output without real API", async () => {
  let requestBody = null;
  const client = {
    responses: {
      parse: async (body) => {
        requestBody = body;
        return {
          id: "resp_test",
          output_parsed: {
            score: 88,
            feedback: "全体の輪郭が三角形として明確です。",
            breakdown: [
              {
                criterion: "左右対称性",
                score: 35,
                maxScore: 40,
                reason: "左右の傾きが近いです。",
              },
            ],
          },
          usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      },
    },
  };

  const result = await evaluateWithOpenAI({
    tournament,
    imageMedia,
    env: { OPENAI_API_KEY: "test", OPENAI_MODEL: "gpt-test" },
    client,
  });

  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-test");
  assert.equal(result.score, 88);
  assert.equal(result.responseId, "resp_test");
  assert.equal(requestBody.model, "gpt-test");
  assert.equal(requestBody.input[0].content[1].type, "input_image");
  assert.equal(requestBody.input[0].content[1].image_url, imageMedia.mediaUrl);
  assert.deepEqual(requestBody.text.format.schema, evaluationJsonSchema);
});

test("OpenAI provider fails safely when API key is missing", async () => {
  await assert.rejects(
    evaluateWithOpenAI({
      tournament,
      imageMedia,
      env: {},
      client: { responses: { parse: async () => ({}) } },
    }),
    { code: "OPENAI_API_KEY_MISSING" }
  );
});

test("OpenAI provider rejects invalid structured output", async () => {
  const client = {
    responses: {
      parse: async () => ({ id: "resp_invalid", output_parsed: null }),
    },
  };

  await assert.rejects(
    evaluateWithOpenAI({
      tournament,
      imageMedia,
      env: { OPENAI_API_KEY: "test" },
      client,
    }),
    { code: "AI_INVALID_RESPONSE" }
  );
});

test("OpenAI provider maps timeout errors safely", async () => {
  const client = {
    responses: {
      parse: async () => {
        const error = new Error("timeout");
        error.name = "APIConnectionTimeoutError";
        throw error;
      },
    },
  };

  await assert.rejects(
    evaluateWithOpenAI({
      tournament,
      imageMedia,
      env: { OPENAI_API_KEY: "test" },
      client,
    }),
    { code: "AI_PROVIDER_TIMEOUT" }
  );
});

test("OpenAI provider maps unexpected provider errors safely", async () => {
  const client = {
    responses: {
      parse: async () => {
        throw new Error("provider unavailable");
      },
    },
  };

  await assert.rejects(
    evaluateWithOpenAI({
      tournament,
      imageMedia,
      env: { OPENAI_API_KEY: "test" },
      client,
    }),
    { code: "AI_PROVIDER_ERROR" }
  );
});
