const { evaluateWithOpenAI } = require("./openaiEvaluationProvider");

function resolveEvaluationProvider(providerName = process.env.VIVORA_AI_PROVIDER) {
  if (!providerName) {
    return null;
  }

  if (providerName === "openai") {
    return {
      name: "openai",
      evaluate: evaluateWithOpenAI,
    };
  }

  return null;
}

module.exports = {
  resolveEvaluationProvider,
};
