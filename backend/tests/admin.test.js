const assert = require("node:assert/strict");
const test = require("node:test");
const {
  canFinalizeTournament,
  isAdminProfile,
  normalizeRole,
} = require("../utils/admin");

test("admin can finalize tournament results", () => {
  assert.equal(canFinalizeTournament({ role: "admin" }), true);
});

test("normal user cannot finalize tournament results", () => {
  assert.equal(canFinalizeTournament({ role: "user" }), false);
});

test("missing authenticated profile is not admin", () => {
  assert.equal(isAdminProfile(null), false);
});

test("unknown roles normalize to user", () => {
  assert.equal(normalizeRole("owner"), "user");
});
