const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveEvaluationProvider } = require("../providers/evaluationProviderResolver");

test("evaluation provider resolver returns OpenAI provider", () => {
  const provider = resolveEvaluationProvider("openai");

  assert.equal(provider.name, "openai");
  assert.equal(typeof provider.evaluate, "function");
});

test("evaluation provider resolver returns null for missing or unsupported provider", () => {
  assert.equal(resolveEvaluationProvider(null), null);
  assert.equal(resolveEvaluationProvider("gemini"), null);
});
