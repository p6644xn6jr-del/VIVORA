const assert = require("node:assert/strict");
const test = require("node:test");
const { buildRanking } = require("../utils/ranking");

test("highest uses each user's best score and ties equal scores", () => {
  const ranking = buildRanking(
    [
      { id: 1, user_id: 1, score: 5 },
      { id: 2, user_id: 1, score: 7 },
      { id: 3, user_id: 2, score: 7 },
      { id: 4, user_id: 3, score: 3 },
    ],
    { direction: "highest", unit: "点", decimal_places: 0 }
  );

  assert.deepEqual(
    ranking.map((item) => [item.rank, item.userId, item.scoreText]),
    [
      [1, 1, "7点"],
      [1, 2, "7点"],
      [3, 3, "3点"],
    ]
  );
});

test("lowest uses each user's lowest score as personal best", () => {
  const ranking = buildRanking(
    [
      { id: 1, user_id: 1, score: 5 },
      { id: 2, user_id: 1, score: 3 },
      { id: 3, user_id: 2, score: 4 },
    ],
    { direction: "lowest", unit: "杯", decimal_places: 0 }
  );

  assert.deepEqual(
    ranking.map((item) => [item.rank, item.userId, item.scoreText]),
    [
      [1, 1, "3杯"],
      [2, 2, "4杯"],
    ]
  );
});

test("closest ranks equal distance as tie and preserves decimal formatting", () => {
  const ranking = buildRanking(
    [
      { id: 1, user_id: 1, score: 9.99 },
      { id: 2, user_id: 2, score: 10.01 },
      { id: 3, user_id: 3, score: 10.2 },
    ],
    { direction: "closest", target: 10, unit: "秒", decimal_places: 3 }
  );

  assert.deepEqual(
    ranking.map((item) => [item.rank, item.userId, item.scoreText]),
    [
      [1, 1, "9.990秒"],
      [1, 2, "10.010秒"],
      [3, 3, "10.200秒"],
    ]
  );
});
