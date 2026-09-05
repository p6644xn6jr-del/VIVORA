// Contest.jsx で大会タイプを表示するときに使える小さなヘルパー。
// API接続後も同じ項目名を使えば、そのまま利用できます。

export function getContestTypeLabel(contest) {
  return contest.type === "vote" ? "投票型" : "数値型";
}

export function getContestTypeDescription(contest) {
  if (contest.type === "vote") {
    return `${contest.voteCount ?? 0}票`;
  }

  if (contest.target == null) {
    return "記録で競う";
  }

  const direction = contest.direction;

  if (direction === "closest") {
    return `目標 ${contest.target}${contest.unit ?? ""}`;
  }

  if (direction === "highest") {
    return `${contest.target}${contest.unit ?? ""}以上を目指す`;
  }

  if (direction === "lowest") {
    return `${contest.target}${contest.unit ?? ""}以下を目指す`;
  }

  return `${contest.target}${contest.unit ?? ""}`;
}
