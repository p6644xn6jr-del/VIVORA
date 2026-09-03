const express = require("express");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authenticateUser = require("../middleware/auth");

// 挑戦を作る
router.post("/", authenticateUser, async (req, res) => {
  const {
    title,
    description,
    imageUrl,
    tags
  } = req.body;

  // 必須項目チェック
  if (
    !title ||
    !description ||
    !imageUrl ||
    !Array.isArray(tags) ||
    tags.length === 0
  ) {
    return res.status(400).json({
      message: "入力してください"
    });
  }

  const { data, error } = await supabase
    .from("challenges")
    .insert([
      {
        title: title,
        description: description,
        image_url: imageUrl,
        tags: tags,
        created_by: req.userId
      }
    ])
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      message: error.message
    });
  }

  return res.status(201).json({
    message: "挑戦作成成功！",
    challenge: data
  });
});

// 挑戦一覧
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: error.message
    });
  }

  return res.status(200).json(data);
});

// 挑戦詳細
router.get("/:id", async (req, res) => {
  const challengeId = Number(req.params.id);

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error) {
    return res.status(404).json({
      message: "挑戦が見つかりません"
    });
  }

  return res.status(200).json(data);
});

module.exports = router;