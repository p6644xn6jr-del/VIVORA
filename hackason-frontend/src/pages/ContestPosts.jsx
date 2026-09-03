import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getContestById, getPosts } from "../services/api";
import PostCard from "../components/PostCard";
import "./TagDetail.css";

export default function ContestPosts() {
  const navigate = useNavigate();
  const { id } = useParams();
  const contestId = Number(id);

  const [contest, setContest] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getContestById(contestId),
      getPosts({ type: "tournament", tournamentId: contestId }),
    ])
      .then(([contestData, posts]) => {
        if (!mounted) return;
        setContest(contestData);
        setPostCount(Array.isArray(posts) ? posts.length : 0);
      })
      .catch((err) => {
        console.error("大会投稿の取得に失敗しました:", err);
        if (mounted) {
          setError(err.message || "大会投稿を取得できませんでした。");
        }
      });

    return () => {
      mounted = false;
    };
  }, [contestId]);

  return (
    <main className="tag-detail-page sm-page">
      <header className="tag-detail-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="戻る">
          ‹
        </button>

        <div>
          <h1>{contest?.title || "大会"}</h1>
          <p>大会の投稿一覧</p>
        </div>

        <div />
      </header>

      <section className="tag-detail-summary">
        <div>
          <span>投稿</span>
          <strong>{postCount == null ? "読み込み中" : `${postCount}件`}</strong>
        </div>

        <div>
          <span>カテゴリー</span>
          <strong>{contest?.category || "—"}</strong>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/post?contestId=${contestId}`)}
        >
          ＋ この大会で投稿する
        </button>
      </section>

      {error && <div className="contest-empty">{error}</div>}

      {!error && (
        <section className="tag-posts">
          <PostCard
            key={`contest-${contestId}`}
            type="tournament"
            tournamentId={contestId}
            sortMode="new"
          />
        </section>
      )}
    </main>
  );
}
