const ADMIN_ROLE = "admin";

function normalizeRole(role) {
  return role === ADMIN_ROLE ? ADMIN_ROLE : "user";
}

function isAdminProfile(profile) {
  return normalizeRole(profile?.role) === ADMIN_ROLE;
}

function canFinalizeTournament(profile) {
  return isAdminProfile(profile);
}

module.exports = {
  ADMIN_ROLE,
  canFinalizeTournament,
  isAdminProfile,
  normalizeRole,
};
