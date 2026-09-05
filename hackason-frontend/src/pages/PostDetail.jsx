import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createPostComment,
  deletePostComment,
  getPostById,
  getPostComments,
  getPostEvaluation,
  getStoredUser,
  togglePostLike,
} from "../services/api";
import "./PostDetail.css";

const EVALUATION_STATUS_LABEL = {
  completed: "AI評価が完了しました",
  failed: "AI評価に失敗しました",
  processing: "AI評価中",
  pending: "AI評価待ち",
};

function getEvaluationStatusLabel(status) {
  return EVALUATION_STATUS_LABEL[status] ?? "AI評価待ち";
}

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [commentBody, setCommentBody] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [error, setError] = useState("");
  const currentUser = getStoredUser();

  useEffect(() => {
    Promise.all([
      getPostById(id),
      getPostComments(id),
      getPostEvaluation(id).catch(() => null),
    ])
      .then(([postData, commentData, evaluationData]) => {
        setPost(postData);
        setComments(commentData);
        setEvaluation(evaluationData);
      })
      .catch((err) => {
        console.error("投稿詳細の取得に失敗しました:", err);
        setError(err.message || "投稿の読み込みに失敗しました。");
      });
  }, [id]);

  const submitComment = async (event) => {
    event.preventDefault();

    const content = commentBody.trim();
    if (!content || isCommenting) return;

    try {
      setIsCommenting(true);
      const result = await createPostComment(id, content);
      setComments((current) => [...current, result.comment]);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: result.comments || current.comments + 1,
            }
          : current
      );
      setCommentBody("");
    } catch (err) {
      console.error("コメント投稿に失敗しました:", err);
      window.alert(err.message || "コメント投稿に失敗しました。");
    } finally {
      setIsCommenting(false);
    }
  };

  const removeComment = async (commentId) => {
    try {
      const result = await deletePostComment(id, commentId);
      setComments((current) => current.filter((item) => item.id !== commentId));
      setPost((current) =>
        current
          ? {
              ...current,
              comments: Number(result.comments ?? Math.max(current.comments - 1, 0)),
            }
          : current
      );
    } catch (err) {
      console.error("コメント削除に失敗しました:", err);
      window.alert(err.message || "コメント削除に失敗しました。");
    }
  };

  const toggleLike = async () => {
    if (!post || isTogglingLike) return;

    try {
      setIsTogglingLike(true);
      const result = await togglePostLike(post.id, post.likedByMe);
      setPost((current) =>
        current
          ? {
              ...current,
              likedByMe: result.liked,
              likes: result.likes,
            }
          : current
      );
    } catch (err) {
      console.error("いいね操作に失敗しました:", err);
      window.alert(err.message || "いいね操作に失敗しました。");
    } finally {
      setIsTogglingLike(false);
    }
  };

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

        {post.postType === "tournament" && post.record != null && (
          <div className="post-detail-record">
            記録 <strong>{post.recordText ?? post.record}</strong>
          </div>
        )}

        {post.media?.length > 0 ? (
          <div className="post-detail-media-grid">
            {post.media.map((item, index) =>
              item.mediaType === "video" ? (
                <video
                  key={`${item.mediaUrl}-${index}`}
                  className="post-detail-image"
                  src={item.mediaUrl}
                  controls
                  playsInline
                />
              ) : (
                <img
                  key={`${item.mediaUrl}-${index}`}
                  className="post-detail-image"
                  src={item.mediaUrl}
                  alt={post.text || "投稿画像"}
                />
              )
            )}
          </div>
        ) : post.image ? (
          <img
            className="post-detail-image"
            src={post.image}
            alt={post.text || "投稿画像"}
          />
        ) : null}

        <div className="post-detail-actions">
          <button
            type="button"
            className={`post-detail-like ${post.likedByMe ? "liked" : ""}`}
            onClick={toggleLike}
            disabled={isTogglingLike}
          >
            <span className="post-detail-like__icon">
              {post.likedByMe ? "♥" : "♡"}
            </span>
            {post.likes}
          </button>
          <span>💬 {post.comments}</span>
        </div>
      </article>

      {evaluation && (
        <section className="post-detail-evaluation">
          <div>
            <h2>評価</h2>
            <span>{getEvaluationStatusLabel(evaluation.status)}</span>
          </div>
          <strong>
            {evaluation.score == null ? "評価待ち" : `Score ${evaluation.score}`}
          </strong>
          <p>
            {evaluation.feedback ||
              evaluation.errorMessage ||
              getEvaluationStatusLabel(evaluation.status)}
          </p>
        </section>
      )}

      <section className="post-detail-comments">
        <div className="post-detail-comments__head">
          <h2>コメント</h2>
          <span>{comments.length}件</span>
        </div>

        <form className="post-detail-comment-form" onSubmit={submitComment}>
          <input
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value.slice(0, 300))}
            placeholder="コメントを書く"
            maxLength={300}
          />
          <button type="submit" disabled={isCommenting || !commentBody.trim()}>
            {isCommenting ? "送信中..." : "送信"}
          </button>
        </form>

        {comments.length > 0 ? (
          <div className="post-detail-comment-list">
            {comments.map((comment) => (
              <article className="post-detail-comment" key={comment.id}>
                <button
                  type="button"
                  className="post-detail-comment__user"
                  onClick={() => navigate(`/profile/${comment.userId}`)}
                >
                  <span>{comment.userIcon}</span>
                  <strong>{comment.userName}</strong>
                </button>
                <p>{comment.content}</p>
                <div>
                  <time>{comment.createdAtText}</time>
                  {Number(currentUser?.id) === Number(comment.userId) && (
                    <button
                      type="button"
                      onClick={() => removeComment(comment.id)}
                    >
                      削除
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="post-detail-comment-empty">
            まだコメントはありません。
          </p>
        )}
      </section>
    </main>
  );
}
