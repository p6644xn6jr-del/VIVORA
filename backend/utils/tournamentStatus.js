function getTournamentStatus(tournament, now = Date.now()) {
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

module.exports = {
  getTournamentStatus,
};
