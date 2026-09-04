const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getTournamentClosedMessage,
  getTournamentStatus,
  isTournamentClosed,
} = require("../utils/tournamentStatus");

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

test("active tournament accepts new participation and submissions", () => {
  assert.equal(
    isTournamentClosed(
      {
        start_at: "2026-09-01T00:00:00.000Z",
        end_at: "2026-09-10T00:00:00.000Z",
        result_finalized_at: null,
      },
      now
    ),
    false
  );
});

test("finished tournament blocks join, post, and record creation", () => {
  const tournament = {
    start_at: "2026-09-01T00:00:00.000Z",
    end_at: "2026-09-03T00:00:00.000Z",
    result_finalized_at: null,
  };

  assert.equal(isTournamentClosed(tournament, now), true);
  assert.match(getTournamentClosedMessage(tournament, now), /終了済み/);
});

test("finalized tournament blocks join, post, and record creation", () => {
  const tournament = {
    start_at: "2026-09-01T00:00:00.000Z",
    end_at: "2026-09-10T00:00:00.000Z",
    result_finalized_at: "2026-09-02T00:00:00.000Z",
  };

  assert.equal(isTournamentClosed(tournament, now), true);
  assert.equal(getTournamentStatus(tournament, now), "finished");
  assert.match(getTournamentClosedMessage(tournament, now), /結果確定済み/);
});
