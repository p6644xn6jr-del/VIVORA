const express = require("express");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handleSignup(req, res) {
  const {
    email,
    password,
    name,
    username,
    birthday,
    age_visibility,
    area,
    icon_url,
    profile
  } = req.body;

  const displayName = name ?? username;

  if (!email || !password || !displayName) {
    return res.status(400).json({
      message: "email、password、name は必須です"
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    return res.status(400).json({
      message: error.message
    });
  }

  if (!data.user) {
    return res.status(500).json({
      message: "ユーザー情報を取得できませんでした"
    });
  }

  // usersテーブルには、両方のbackendで使われていたプロフィール項目をまとめて保存。
  const profileRow = {
    id: data.user.id,
    display_name: displayName,
    email,
    birthday: birthday ?? null,
    age_visibility: age_visibility ?? false,
    area: area ?? null,
    icon_url: icon_url ?? null,
    profile: profile ?? null
  };

  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .insert([profileRow])
    .select()
    .single();

  if (profileError) {
    return res.status(500).json({
      message: profileError.message
    });
  }

  return res.status(201).json({
    message: "登録成功！",
    user: profileData ?? data.user
  });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "email と password は必須です"
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json({
      message: error.message
    });
  }

  let profile = null;

  if (data.user?.id) {
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    profile = profileData;
  }

  return res.json({
    message: "ログイン成功！",
    user: profile ?? data.user,
    session: data.session
  });
}

router.post("/signup", handleSignup);
router.post("/login", handleLogin);

// app.jsから旧URL互換で使うため公開
router.handleSignup = handleSignup;
router.handleLogin = handleLogin;

module.exports = router;
