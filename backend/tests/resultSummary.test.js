const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildResultSummary,
  emptyResultSummary,
} = require("../utils/resultSummary");

test("empty result summary does not use dummy winner or rank values", () => {
  assert.deepEqual(emptyResultSummary(), {
    recentResults: [],
    winners: [],
    history: [],
    stats: {
      joinedCount: 0,
      titleCount: 0,
      bestRank: null,
    },
  });
});

test("result summary keeps real winner data only", () => {
  const summary = buildResultSummary({
    winners: [{ userName: "Shion Watanabe", rank: 1 }],
    joinedCount: 1,
    titleCount: 1,
    bestRank: 1,
  });

  assert.equal(summary.winners[0].userName, "Shion Watanabe");
  assert.equal(summary.stats.bestRank, 1);
  assert.equal(summary.winners.every((winner) => winner.userName), true);
});
