import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getContestById,
  getPosts,
  togglePostLike,
} from "../services/api";
import "./PostCard.css";

export default function PostCard({ tag, userId, sortMode, type, tournamentId }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [liked, setLiked] = useState([]);
  const [tournamentNames, setTournamentNames] = useState({});
  const [feedTab, setFeedTab] = useState("おすすめ");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleFeedChange = (event) => {
      setFeedTab(event.detail?.tab ?? "おすすめ");
    };

    window.addEventListener("vivora:feed-change", handleFeedChange);

    return () => {
      window.removeEventListener("vivora:feed-change", handleFeedChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError("");

    getPosts({ tag, userId, sortMode, type, tournamentId })
      .then((postData) => {
        if (!mounted) return;

        let displayPosts = Array.isArray(postData) ? postData : [];

        if (tournamentId != null) {
          displayPosts = displayPosts.filter(
            (post) => Number(post.contestId) === Number(tournamentId)
          );
        }

        const sortNewest = (items) =>
          [...items].sort((a, b) => {
            const aTime = new Date(a.createdAtText ?? 0).getTime();
            const bTime = new Date(b.createdAtText ?? 0).getTime();

            if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
            if (Number.isNaN(aTime)) return 1;
            if (Number.isNaN(bTime)) return -1;

            return bTime - aTime;
          });

        if (sortMode === "new" || userId != null || feedTab === "新着") {
          displayPosts = sortNewest(displayPosts);
        }

        setPosts(displayPosts);

        // GET /posts の likedByMe をそのまま初期状態に使う。
        setLiked(
          displayPosts
            .filter((post) => post?.likedByMe === true)
            .map((post) => post.id)
        );

        const tournamentIds = [
          ...new Set(
            displayPosts
              .filter(
                (post) =>
                  post.postType === "tournament" && post.contestId != null
              )
              .map((post) => String(post.contestId))
          ),
        ];

        if (tournamentIds.length === 0) {
          setTournamentNames({});
          return;
        }

        Promise.all(
          tournamentIds.map(async (tournamentId) => {
            const contest = await getContestById(tournamentId);
            return [
              tournamentId,
              contest?.title ?? contest?.name ?? `大会${tournamentId}`,
            ];
          })
        )
          .then((entries) => {
            if (!mounted) return;
            setTournamentNames(Object.fromEntries(entries));
          })
          .catch((err) => {
            console.error("大会名の取得に失敗しました:", err);
          });
      })
      .catch((err) => {
        console.error("投稿一覧の取得に失敗しました:", err);

        if (mounted) {
          setPosts([]);
          setLiked([]);
          setError("投稿の読み込みに失敗しました。");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [tag, userId, feedTab, sortMode, type, tournamentId]);

  const like = async (event, id) => {
    event.stopPropagation();

    const currentPost = posts.find((post) => post.id === id);
    const currentlyLiked =
      currentPost?.likedByMe === true || liked.includes(id);

    try {
      // 現在の状態を渡して POST / DELETE を正しく切り替える。
      const result = await togglePostLike(id, currentlyLiked);

      setLiked((current) =>
        result.liked
          ? [...new Set([...current, id])]
          : current.filter((value) => value !== id)
      );

      setPosts((current) =>
        current.map((post) =>
          post.id === id
            ? {
                ...post,
                likedByMe: result.liked,
                likes:
                  result.likes != null
                    ? Number(result.likes)
                    : Math.max(
                        0,
                        Number(post.likes ?? 0) +
                          (result.liked ? 1 : -1)
                      ),
              }
            : post
        )
      );
    } catch (err) {
      console.error("いいねの更新に失敗しました:", err);
    }
  };

  if (
    sortMode == null &&
    userId == null &&
    ["おすすめ", "フォロー中", "急上昇"].includes(feedTab)
  ) {
    return (
      <section className="posts">
        <div className="contest-empty">
          「{feedTab}」は準備中です。
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="posts">
        <div className="contest-empty">投稿を読み込んでいます…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="posts">
        <div className="contest-empty">{error}</div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="posts">
        <div className="contest-empty">まだ投稿がありません。</div>
      </section>
    );
  }

  return (
    <section className="posts">
      {posts.map((post) => {
        const isLiked =
          post?.likedByMe === true || liked.includes(post.id);

        return (
          <article
            className="post-card"
            key={post.id}
            onClick={() => navigate(`/posts/${post.id}`)}
            role="link"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/posts/${post.id}`);
              }
            }}
          >
            <div className="post-header">
              <button
                type="button"
                className="post-user"
                onClick={(event) => {
                  event.stopPropagation();

                  if (post.userId != null) {
                    navigate(`/users/${post.userId}`);
                  }
                }}
                aria-label={`${post.userName}のプロフィールを見る`}
              >
                <div className="post-icon">{post.userIcon}</div>

                <div>
                  <h3>{post.userName}</h3>
                  <span>{post.createdAtText}</span>
                </div>
              </button>

              <button
                type="button"
                className="post-menu"
                aria-label="投稿メニュー"
                onClick={(event) => event.stopPropagation()}
              >
                •••
              </button>
            </div>

            <div className="post-content">
              {post.postType === "tournament" ? (
                <div className="post-tags">
                  <button
                    type="button"
                    className="post-tag-button post-tournament-tag"
                    onClick={(event) => {
                      event.stopPropagation();

                      if (post.contestId != null) {
                        navigate(`/contests/detail/${post.contestId}`);
                      }
                    }}
                    style={{
                      color: "#b8860b",
                      background: "#fff8dc",
                      borderColor: "#d4af37",
                    }}
                  >
                    {tournamentNames[String(post.contestId)] ?? "大会投稿"}
                  </button>
                </div>
              ) : post.tags.length > 0 ? (
                <div className="post-tags">
                  {post.tags.map((postTag) => (
                    <button
                      type="button"
                      className="post-tag-button"
                      key={postTag}
                      onClick={(event) => {
                        event.stopPropagation();

                        navigate(
                          `/tags/${encodeURIComponent(
                            String(postTag).replace(/^#/, "")
                          )}`
                        );
                      }}
                    >
                      #{String(postTag).replace(/^#/, "")}
                    </button>
                  ))}
                </div>
              ) : null}

              <h4>{post.text}</h4>
            </div>

            {(post.media?.length > 0 || post.image) && (
              <div className="post-media-preview">
                {post.media?.[0]?.mediaType === "video" ? (
                  <video
                    src={post.media[0].mediaUrl}
                    className="post-image"
                    muted
                    playsInline
                    controls
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <img
                    src={post.media?.[0]?.mediaUrl || post.image}
                    alt={post.text || "投稿画像"}
                    className="post-image"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/posts/${post.id}`);
                    }}
                  />
                )}

                {post.media?.length > 1 && (
                  <span className="post-media-preview__count">
                    1/{post.media.length}
                  </span>
                )}
              </div>
            )}

            {post.postType === "tournament" && post.record != null && (
              <div className="post-record-badge">
                記録 {post.recordText ?? post.record}
              </div>
            )}

            <div className="post-content">
              <div className="post-actions">
                <button
                  type="button"
                  className={`post-action ${isLiked ? "liked" : ""}`}
                  onClick={(event) => like(event, post.id)}
                >
                  {isLiked ? "♥" : "♡"} {post.likes}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
