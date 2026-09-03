const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildTitleAwardRows,
  selectTitleWinners,
} = require("../utils/titleAwards");

test("selects all tied rank-1 users as title winners", () => {
  const winners = selectTitleWinners([
    { rank: 1, userId: 1, recordId: 11 },
    { rank: 1, userId: 2, recordId: 22 },
    { rank: 3, userId: 3, recordId: 33 },
  ]);

  assert.deepEqual(
    winners.map((item) => item.userId),
    [1, 2]
  );
});

test("builds idempotent user title award rows for upsert", () => {
  const rows = buildTitleAwardRows(
    [
      { rank: 1, userId: 1, recordId: 11 },
      { rank: 1, userId: 2, recordId: 22 },
    ],
    { id: 9 },
    5
  );

  assert.deepEqual(rows, [
    {
      user_id: 1,
      title_id: 9,
      tournament_id: 5,
      record_id: 11,
      rank: 1,
    },
    {
      user_id: 2,
      title_id: 9,
      tournament_id: 5,
      record_id: 22,
      rank: 1,
    },
  ]);
});
