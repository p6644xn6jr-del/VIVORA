import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPostById } from "../services/api";
import "./PostDetail.css";

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getPostById(id)
      .then(setPost)
      .catch((err) => {
        console.error("投稿詳細の取得に失敗しました:", err);
        setError(err.message || "投稿の読み込みに失敗しました。");
      });
  }, [id]);

  if (error) {
    return (
      <main className="post-detail-page">
        <button type="button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <p>{error}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="post-detail-page">
        <button type="button" onClick={() => navigate(-1)}>
          ← 戻る
        </button>
        <p>投稿を読み込んでいます…</p>
      </main>
    );
  }

  return (
    <main className="post-detail-page">
      <header className="post-detail-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="戻る">
          ‹
        </button>
        <h1>投稿</h1>
        <span />
      </header>

      <article className="post-detail-card">
        <div className="post-detail-user">
          <div className="post-detail-icon">{post.userIcon}</div>
          <div>
            <strong>{post.userName}</strong>
            <small>{post.createdAtText}</small>
          </div>
        </div>

        {post.tags?.length > 0 && (
          <div className="post-detail-tags">
            {post.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() =>
                  navigate(
                    `/tags/${encodeURIComponent(
                      String(tag).replace(/^#/, "")
                    )}`
                  )
                }
              >
                #{String(tag).replace(/^#/, "")}
              </button>
            ))}
          </div>
        )}

        <p className="post-detail-text">{post.text}</p>

        {post.image && (
          <img
            className="post-detail-image"
            src={post.image}
            alt={post.text || "投稿画像"}
          />
        )}

        <div className="post-detail-actions">
          <span>♡ {post.likes}</span>
          <span>💬 {post.comments}</span>
        </div>
      </article>
    </main>
  );
}
