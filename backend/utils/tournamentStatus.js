function getTournamentStatus(tournament, now = Date.now()) {
  if (tournament?.result_finalized_at) return "finished";

  const start = tournament?.start_at
    ? new Date(tournament.start_at).getTime()
    : Number.NEGATIVE_INFINITY;
  const end = tournament?.end_at
    ? new Date(tournament.end_at).getTime()
    : Number.POSITIVE_INFINITY;

  if (!Number.isNaN(start) && now < start) return "upcoming";
  if (!Number.isNaN(end) && now > end) return "finished";

  return "active";
}

function isTournamentClosed(tournament, now = Date.now()) {
  return getTournamentStatus(tournament, now) === "finished";
}

function getTournamentClosedMessage(tournament, now = Date.now()) {
  if (tournament?.result_finalized_at) {
    return "この大会は結果確定済みのため、新しい参加や投稿はできません";
  }

  if (getTournamentStatus(tournament, now) === "finished") {
    return "この大会は終了済みのため、新しい参加や投稿はできません";
  }

  return "";
}

module.exports = {
  getTournamentStatus,
  getTournamentClosedMessage,
  isTournamentClosed,
};
