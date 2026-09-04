const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const { normalizeRole } = require("../utils/admin");

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "ログインが必要です"
    });
  }

  const accessToken = authHeader.split(" ")[1];

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return res.status(401).json({
      message: "認証に失敗しました"
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({
      message: "ユーザー情報が見つかりません"
    });
  }

  req.authUser = user;
  req.user = profile;
  req.userId = profile.user_id;
  req.userRole = normalizeRole(profile.role);

  next();
};

module.exports = authenticateUser;
