import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPosts,
  getUserById,
  getStoredUser,
} from "../services/api";
import PostCard from "../components/PostCard";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isOwnProfile = !id;
  const parsedId = Number(id);
  const storedUser = getStoredUser();

  const targetId = isOwnProfile
    ? Number(storedUser?.id)
    : parsedId;

  const resolvedTargetId =
    Number.isFinite(targetId) && targetId > 0 ? targetId : null;

  const [user, setUser] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [error, setError] = useState("");
  const [postType, setPostType] = useState("commitment");

  useEffect(() => {
    let mounted = true;

    setUser(null);
    setPostCount(null);
    setError("");

    if (resolvedTargetId == null) {
      setError("ログイン中のユーザーが確認できません。");
      return () => {
        mounted = false;
      };
    }

    Promise.all([
      getUserById(resolvedTargetId),
      getPosts({ userId: resolvedTargetId }),
    ])
      .then(([userData, posts]) => {
        if (!mounted) return;

        if (!userData) {
          setError("ユーザーが見つかりません。");
          return;
        }

        setUser(userData);
        setPostCount(Array.isArray(posts) ? posts.length : 0);
      })
      .catch((err) => {
        console.error("プロフィール情報の取得に失敗しました:", err);

        if (mounted) {
          setError(
            err.message || "プロフィール情報を取得できませんでした。"
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [resolvedTargetId]);

  if (error) {
    return (
      <main className="profile-page">
        <header className="profile-page__header">
          <button
            type="button"
            className="profile-page__back"
            onClick={() => navigate(-1)}
            aria-label="戻る"
          >
            ‹
          </button>
          <h1>プロフィール</h1>
          <span />
        </header>

        <div className="profile-state">
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="profile-page">
        <header className="profile-page__header">
          <button
            type="button"
            className="profile-page__back"
            onClick={() => navigate(-1)}
            aria-label="戻る"
          >
            ‹
          </button>
          <h1>{isOwnProfile ? "マイページ" : "プロフィール"}</h1>
          <span />
        </header>

        <div className="profile-state">
          <p>プロフィールを読み込んでいます…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <header className="profile-page__header">
        <button
          type="button"
          className="profile-page__back"
          onClick={() => navigate(-1)}
          aria-label="戻る"
        >
          ‹
        </button>

        <h1>{isOwnProfile ? "マイページ" : "プロフィール"}</h1>
        <span />
      </header>

      <section className="profile-card">
        <div className="profile-card__top">
          <div className="profile-avatar" aria-hidden="true">
            {user.icon ?? "🙂"}
          </div>

          <div className="profile-card__identity">
            <h2>{user.name ?? "ユーザー"}</h2>
            <p>{user.area ?? "準備中です"}</p>
            <span>ユーザーID：{user.id}</span>
          </div>
        </div>

        <div className="profile-card__meta">
          <div>
            <span>地域</span>
            <strong>{user.area ?? "準備中です"}</strong>
          </div>

          <div>
            <span>投稿</span>
            <strong>
              {postCount == null ? "準備中です" : `${postCount}件`}
            </strong>
          </div>

          <div>
            <span>フォロー</span>
            <strong>準備中です</strong>
          </div>

          <div>
            <span>フォロワー</span>
            <strong>準備中です</strong>
          </div>
        </div>
      </section>

      <section className="profile-posts">
        <div className="profile-section-heading">
          <h2>{isOwnProfile ? "自分の投稿" : `${user.name}の投稿`}</h2>
        </div>

        <div className="profile-post-tabs">
          <button
            type="button"
            className={postType === "commitment" ? "active" : ""}
            onClick={() => setPostType("commitment")}
          >
            こだわり
          </button>

          <button
            type="button"
            className={postType === "tournament" ? "active" : ""}
            onClick={() => setPostType("tournament")}
          >
            大会
          </button>
        </div>

        <PostCard
          key={`${user.id}-${postType}`}
          userId={user.id}
          type={postType}
        />
      </section>
    </main>
  );
}

export default Profile;
