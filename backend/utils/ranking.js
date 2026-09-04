function normalizeDirection(direction) {
  if (["highest", "lowest", "closest"].includes(direction)) {
    return direction;
  }

  return "highest";
}

function getRecordScore(record) {
  return Number(record?.score ?? record?.record ?? 0);
}

function getDecimalPlaces(tournament) {
  const places = Number(tournament?.decimal_places ?? tournament?.decimalPlaces ?? 0);

  return Number.isInteger(places) && places >= 0 && places <= 6 ? places : 0;
}

function formatScore(score, tournament, unit) {
  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    return `—${unit ?? ""}`;
  }

  return `${numericScore.toFixed(getDecimalPlaces(tournament))}${unit ?? ""}`;
}

function compareRecords(tournament) {
  const direction = normalizeDirection(tournament?.direction);
  const target = Number(tournament?.target ?? 0);

  return (a, b) => {
    const aScore = getRecordScore(a);
    const bScore = getRecordScore(b);
    const aTime = new Date(a?.created_at ?? a?.createdAt ?? 0).getTime();
    const bTime = new Date(b?.created_at ?? b?.createdAt ?? 0).getTime();

    if (direction === "lowest") {
      const diff = aScore - bScore;
      return diff === 0 ? aTime - bTime : diff;
    }

    if (direction === "closest") {
      const aDistance = Math.abs(aScore - target);
      const bDistance = Math.abs(bScore - target);

      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }

      return aTime - bTime;
    }

    const diff = bScore - aScore;
    return diff === 0 ? aTime - bTime : diff;
  };
}

function rankScoreKey(record, tournament) {
  const score = getRecordScore(record);
  const direction = normalizeDirection(tournament?.direction);

  if (direction === "closest") {
    return String(Number(Math.abs(score - Number(tournament?.target ?? 0)).toFixed(12)));
  }

  return String(score);
}

function pickBestRecordPerUser(records, tournament) {
  const compare = compareRecords(tournament);
  const bestByUser = new Map();

  for (const record of records) {
    const userId = record?.user_id ?? record?.userId;
    if (userId == null) continue;

    const currentBest = bestByUser.get(String(userId));

    if (!currentBest || compare(record, currentBest) < 0) {
      bestByUser.set(String(userId), record);
    }
  }

  return [...bestByUser.values()];
}

function buildRanking(records, tournament) {
  const sorted = pickBestRecordPerUser(records, tournament).sort(compareRecords(tournament));
  let previousScoreKey = null;
  let previousRank = 0;

  return sorted.map((record, index) => {
    const score = getRecordScore(record);
    const unit = record.unit ?? tournament?.unit ?? "";
    const decimalPlaces = getDecimalPlaces(tournament);
    const scoreKey = rankScoreKey(record, tournament);
    const rank = scoreKey === previousScoreKey ? previousRank : index + 1;

    previousScoreKey = scoreKey;
    previousRank = rank;

    return {
      rank,
      recordId: record.id,
      postId: record.post_id ?? record.postId ?? null,
      userId: record.user_id ?? record.userId,
      score,
      unit,
      decimalPlaces,
      scoreText: formatScore(score, tournament, unit),
      verified: record.verified ?? false,
      createdAt: record.created_at ?? record.createdAt ?? null,
      distance:
        normalizeDirection(tournament?.direction) === "closest"
          ? Math.abs(score - Number(tournament?.target ?? 0))
          : null,
      userName:
        record.users?.display_name ??
        record.userName ??
        record.display_name ??
        null,
      userIcon:
        record.users?.icon_url ??
        record.userIcon ??
        record.icon_url ??
        null,
      imageUrl:
        record.posts?.image_url ??
        record.image_url ??
        null,
    };
  });
}

module.exports = {
  buildRanking,
  formatScore,
  normalizeDirection,
};
