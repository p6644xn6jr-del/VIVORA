function selectTitleWinners(ranking) {
  return (Array.isArray(ranking) ? ranking : []).filter(
    (item) => Number(item?.rank) === 1
  );
}

function buildTitleAwardRows(winners, title, tournamentId) {
  return selectTitleWinners(winners).map((winner) => ({
    user_id: winner.userId,
    title_id: title.id,
    tournament_id: tournamentId,
    record_id: winner.recordId,
    rank: winner.rank,
  }));
}

module.exports = {
  buildTitleAwardRows,
  selectTitleWinners,
};
