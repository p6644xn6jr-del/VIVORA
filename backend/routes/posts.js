const express = require("express");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authenticateUser = require("../middleware/auth");

async function countPostComments(postId) {
  const { count } = await supabase
    .from("post_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return count || 0;
}

// 投稿を作る
router.post("/", authenticateUser, async (req, res) => {
  const {
    content,
    imageUrl,
    tags,
    type,
    challengeId,
    tournamentId,
    record,
    media
  } = req.body;

  // 共通必須
  if (
    !content ||
    !type ||
    !Array.isArray(tags) ||
    tags.length === 0
  ) {
    return res.status(400).json({
      message: "入力してください"
    });
  }

  // 投稿タイプ確認
  if (
    type !== "commitment" &&
    type !== "challenge" &&
    type !== "tournament"
  ) {
    return res.status(400).json({
      message: "投稿タイプが正しくありません"
    });
  }

  // media確認
  if (media !== undefined) {
    if (!Array.isArray(media)) {
      return res.status(400).json({
        message: "mediaは配列で送ってください"
      });
    }

    if (media.length > 5) {
      return res.status(400).json({
        message: "画像・動画は最大5個までです"
      });
    }

    for (const item of media) {
      if (
        !item.mediaType ||
        !item.mediaUrl ||
        (
          item.mediaType !== "image" &&
          item.mediaType !== "video"
        )
      ) {
        return res.status(400).json({
          message: "mediaの形式が正しくありません"
        });
      }
    }
  }

  // 挑戦投稿
  if (type === "challenge" && !challengeId) {
    return res.status(400).json({
      message: "挑戦を選択してください"
    });
  }

  // 大会投稿
  if (
    type === "tournament" &&
    (
      !tournamentId ||
      record === undefined ||
      record === null ||
      record === ""
    )
  ) {
    return res.status(400).json({
      message: "大会と記録を入力してください"
    });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        user_id: req.userId,
        content: content,
        image_url: imageUrl || null,
        tags: tags,
        type: type,
        challenge_id: type === "challenge" ? challengeId : null,
        tournament_id: type === "tournament" ? tournamentId : null,
        record: type === "tournament" ? record : null,
        verified: false,
        media: media || []
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
    message: "投稿成功！",
    post: data
  });
});

// 投稿一覧
router.get("/", async (req, res) => {
  const {
    type,
    tag,
    challengeId,
    tournamentId
  } = req.query;

  let query = supabase
    .from("posts")
    .select("*, tournaments(unit, decimal_places)");

  if (type) {
    query = query.eq("type", type);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (challengeId) {
    query = query.eq("challenge_id", Number(challengeId));
  }

  if (tournamentId) {
    query = query.eq("tournament_id", Number(tournamentId));
  }

  const { data: posts, error } = await query
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      message: error.message
    });
  }

  // ログイン中ユーザーを取得
  const authHeader = req.headers.authorization;

  let currentUserId = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.split(" ")[1];

    const {
      data: { user }
    } = await supabase.auth.getUser(accessToken);

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("user_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        currentUserId = profile.user_id;
      }
    }
  }

  // 各投稿にいいね情報を追加
  const postsWithLikes = await Promise.all(
    posts.map(async (post) => {
      const { count } = await supabase
        .from("post_likes")
        .select("*", {
          count: "exact",
          head: true
        })
        .eq("post_id", post.id);

      let likedByMe = false;

      if (currentUserId) {
        const { data: myLike } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        likedByMe = !!myLike;
      }

      return {
        ...post,
        likes: count || 0,
        comments: await countPostComments(post.id),
        likedByMe: likedByMe
      };
    })
  );

  return res.status(200).json(postsWithLikes);
});

// 投稿詳細
router.get("/:id", async (req, res) => {
  const postId = Number(req.params.id);

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, tournaments(unit, decimal_places)")
    .eq("id", postId)
    .single();

  if (error) {
    return res.status(404).json({
      message: "投稿が見つかりません"
    });
  }

  const { count } = await supabase
    .from("post_likes")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("post_id", postId);

  let likedByMe = false;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.split(" ")[1];

    const {
      data: { user }
    } = await supabase.auth.getUser(accessToken);

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("user_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        const { data: myLike } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", profile.user_id)
          .maybeSingle();

        likedByMe = !!myLike;
      }
    }
  }

  return res.status(200).json({
    ...post,
    likes: count || 0,
    comments: await countPostComments(postId),
    likedByMe: likedByMe
  });
});

// 投稿コメント一覧
router.get("/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({
      message: "投稿IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("post_comments")
    .select("*, users(display_name, icon_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return res.status(500).json({
      message: "コメント一覧の取得に失敗しました",
      error: error.message
    });
  }

  return res.json(data ?? []);
});

// 投稿コメント作成
router.post("/:id/comments", authenticateUser, async (req, res) => {
  const postId = Number(req.params.id);
  const content = String(req.body?.content ?? "").trim();

  if (!Number.isInteger(postId)) {
    return res.status(400).json({
      message: "投稿IDが不正です"
    });
  }

  if (!content) {
    return res.status(400).json({
      message: "コメントを入力してください"
    });
  }

  if (content.length > 300) {
    return res.status(400).json({
      message: "コメントは300文字以内で入力してください"
    });
  }

  const { data, error } = await supabase
    .from("post_comments")
    .insert([
      {
        post_id: postId,
        user_id: req.userId,
        content
      }
    ])
    .select("*, users(display_name, icon_url)")
    .single();

  if (error) {
    return res.status(500).json({
      message: "コメントの保存に失敗しました",
      error: error.message
    });
  }

  return res.status(201).json({
    message: "コメントしました",
    comment: data,
    comments: await countPostComments(postId)
  });
});

// 投稿コメント削除
router.delete("/:id/comments/:commentId", authenticateUser, async (req, res) => {
  const postId = Number(req.params.id);
  const commentId = Number(req.params.commentId);

  if (!Number.isInteger(postId) || !Number.isInteger(commentId)) {
    return res.status(400).json({
      message: "コメントIDが不正です"
    });
  }

  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .eq("user_id", req.userId);

  if (error) {
    return res.status(500).json({
      message: "コメントの削除に失敗しました",
      error: error.message
    });
  }

  return res.json({
    message: "コメントを削除しました",
    comments: await countPostComments(postId)
  });
});

// いいねする
router.post("/:id/like", authenticateUser, async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({
      message: "投稿IDが不正です"
    });
  }

  const { data, error } = await supabase
    .from("post_likes")
    .insert([
      {
        post_id: postId,
        user_id: req.userId
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "すでにいいねしています"
      });
    }

    return res.status(500).json({
      message: error.message
    });
  }

  const { count } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return res.status(201).json({
    message: "いいねしました",
    like: data,
    likes: count || 0
  });
});

// いいね解除
router.delete("/:id/like", authenticateUser, async (req, res) => {
  const postId = Number(req.params.id);

  if (!Number.isInteger(postId)) {
    return res.status(400).json({
      message: "投稿IDが不正です"
    });
  }

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", req.userId);

  if (error) {
    return res.status(500).json({
      message: error.message
    });
  }

  const { count } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  return res.status(200).json({
    message: "いいねを解除しました",
    likes: count || 0
  });
});

module.exports = router;
