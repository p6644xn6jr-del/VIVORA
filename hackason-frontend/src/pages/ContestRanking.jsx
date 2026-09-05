import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getContestById, getTournamentRanking, getUserById } from "../services/api";
import "./ContestRanking.css";

function ContestRanking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const tournamentId = Number(id);
    let mounted = true;

    if (!Number.isInteger(tournamentId)) {
      setError("大会IDが不正です。");
      setLoading(false);
      return undefined;
    }

    Promise.all([
      getContestById(tournamentId),
      getTournamentRanking(tournamentId),
    ])
      .then(async ([contestData, rankingData]) => {
        if (!mounted) return;

        const list = Array.isArray(rankingData) ? rankingData : [];
        const enriched = await Promise.all(
          list.map(async (item) => {
            try {
              const user = await getUserById(item.userId);
              return {
                ...item,
                userName:
                  user?.name ??
                  user?.displayName ??
                  user?.display_name ??
                  `ユーザーID: ${item.userId ?? "不明"}`,
                image: user?.icon ?? user?.icon_url ?? null,
              };
            } catch {
              return {
                ...item,
                userName: `ユーザーID: ${item.userId ?? "不明"}`,
                image: null,
              };
            }
          })
        );

        if (!mounted) return;
        setContest(contestData);
        setRanking(enriched);
      })
      .catch((err) => {
        console.error("ランキングの取得に失敗しました:", err);
        if (!mounted) return;
        setError(err?.message || "ランキングの取得に失敗しました。");
        setRanking([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <main className="contest-ranking-page">
      <header className="contest-ranking-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="戻る">
          ‹
        </button>
        <div>
          <h1>ランキング</h1>
          <p>{contest?.title ?? "大会ランキング"}</p>
        </div>
        <div className="contest-ranking-header__spacer" />
      </header>

      <section className="contest-ranking-card">
        {loading ? (
          <p className="contest-ranking-message">ランキングを読み込んでいます…</p>
        ) : error ? (
          <p className="contest-ranking-message">{error}</p>
        ) : ranking.length === 0 ? (
          <p className="contest-ranking-message">ランキングデータはありません。</p>
        ) : (
          ranking.map((item, index) => {
            const rank = Number(item.rank ?? index + 1);
            return (
              <div className="contest-ranking-page-row" key={`${item.userId}-${rank}-${index}`}>
                <span className={`contest-ranking-page-rank rank-${rank}`}>
                  {rank}
                </span>

                {item.image ? (
                  <img src={item.image} alt="" />
                ) : (
                  <div className="contest-ranking-page-avatar">●</div>
                )}

                <div className="contest-ranking-page-user">
                  <strong>{item.userName}</strong>
                  <span>ユーザーID: {item.userId ?? "不明"}</span>
                </div>

                <strong className="contest-ranking-page-score">
                  {contest?.rankingLabel
                    ? `${contest.rankingLabel} ${item.score}`
                    : item.score}
                </strong>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

export default ContestRanking;
