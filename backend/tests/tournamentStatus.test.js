const assert = require("node:assert/strict");
const test = require("node:test");
const { getTournamentStatus } = require("../utils/tournamentStatus");

const now = new Date("2026-09-04T00:00:00.000Z").getTime();

test("returns upcoming before start_at", () => {
  assert.equal(
    getTournamentStatus(
      {
        start_at: "2026-09-05T00:00:00.000Z",
        end_at: "2026-09-10T00:00:00.000Z",
      },
      now
    ),
    "upcoming"
  );
});

test("returns active between start_at and end_at", () => {
  assert.equal(
    getTournamentStatus(
      {
        start_at: "2026-09-01T00:00:00.000Z",
        end_at: "2026-09-10T00:00:00.000Z",
      },
      now
    ),
    "active"
  );
});

test("returns finished after end_at", () => {
  assert.equal(
    getTournamentStatus(
      {
        start_at: "2026-09-01T00:00:00.000Z",
        end_at: "2026-09-03T00:00:00.000Z",
      },
      now
    ),
    "finished"
  );
});
