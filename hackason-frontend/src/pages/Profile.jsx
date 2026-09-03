import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getPosts,
  getUserById,
  getUserRecords,
  getUserTitles,
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
  const [titles, setTitles] = useState([]);
  const [records, setRecords] = useState([]);
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
      getUserTitles(resolvedTargetId),
      getUserRecords(resolvedTargetId),
    ])
      .then(([userData, posts, titleData, recordData]) => {
        if (!mounted) return;

        if (!userData) {
          setError("ユーザーが見つかりません。");
          return;
        }

        setUser(userData);
        setPostCount(Array.isArray(posts) ? posts.length : 0);
        setTitles(Array.isArray(titleData) ? titleData : []);
        setRecords(Array.isArray(recordData) ? recordData.slice(0, 3) : []);
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

  const featuredTitle = titles[0] ?? null;

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

      {featuredTitle && (
        <button
          type="button"
          className="profile-featured-title"
          onClick={() => navigate(`/titles/${featuredTitle.id}`)}
        >
          <img src={featuredTitle.imageUrl} alt="" />
          <div>
            <span>代表称号</span>
            <strong>{featuredTitle.name}</strong>
            <small>{featuredTitle.tournamentTitle || "大会称号"}</small>
          </div>
        </button>
      )}

      <section className="profile-titles">
        <div className="profile-section-heading">
          <h2>{isOwnProfile ? "獲得称号" : `${user.name}の称号`}</h2>
          <span>{titles.length}件</span>
        </div>

        {titles.length > 0 ? (
          <div className="profile-title-grid">
            {titles.map((title) => (
              <button
                type="button"
                className="profile-title-card"
                key={title.id}
                onClick={() => navigate(`/titles/${title.id}`)}
              >
                <img src={title.imageUrl} alt="" />
                <strong>{title.name}</strong>
                <span>{title.tournamentTitle || "大会称号"}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="profile-empty-panel">
            まだ称号はありません。
          </div>
        )}
      </section>

      <section className="profile-records">
        <div className="profile-section-heading">
          <h2>{isOwnProfile ? "最近の記録" : `${user.name}の記録`}</h2>
        </div>

        {records.length > 0 ? (
          <div className="profile-record-list">
            {records.map((record) => (
              <button
                type="button"
                className="profile-record-row"
                key={record.id}
                onClick={() => navigate(`/contests/detail/${record.tournamentId}`)}
              >
                <span>{record.tournamentTitle || "大会"}</span>
                <strong>{record.scoreText ?? `${record.score}${record.unit}`}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="profile-empty-panel">
            まだ大会記録はありません。
          </div>
        )}
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
