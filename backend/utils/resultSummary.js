function emptyResultSummary() {
  return {
    recentResults: [],
    winners: [],
    history: [],
    stats: {
      joinedCount: 0,
      titleCount: 0,
      bestRank: null,
    },
  };
}

function buildResultSummary({
  recentResults = [],
  winners = [],
  history = [],
  joinedCount = 0,
  titleCount = 0,
  bestRank = null,
} = {}) {
  const safeBestRank =
    Number.isInteger(bestRank) && bestRank > 0 ? bestRank : null;

  return {
    recentResults: Array.isArray(recentResults) ? recentResults : [],
    winners: Array.isArray(winners) ? winners : [],
    history: Array.isArray(history) ? history : [],
    stats: {
      joinedCount: Number.isFinite(Number(joinedCount)) ? Number(joinedCount) : 0,
      titleCount: Number.isFinite(Number(titleCount)) ? Number(titleCount) : 0,
      bestRank: safeBestRank,
    },
  };
}

module.exports = {
  buildResultSummary,
  emptyResultSummary,
};
