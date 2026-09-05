import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getContestById,
  getPosts,
  getCurrentUser,
  getTournamentRanking,
  getTournamentParticipants,
  cancelTournamentParticipation,
} from "../services/api";
import "./ContestDetail.css";

const STATUS_LABEL = {
  active: "開催中",
  upcoming: "開催予定",
  finished: "終了",
};

function ContestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [isParticipating, setIsParticipating] = useState(false);

  const loadParticipationState = async (tournamentId) => {
    const [currentUser, participants] = await Promise.all([
      getCurrentUser(),
      getTournamentParticipants(tournamentId),
    ]);

    const joined = participants.some((item) => {
      const participantUserId =
        item?.user?.user_id ??
        item?.user?.id ??
        item?.user_id ??
        item?.userId;

      return Number(participantUserId) === Number(currentUser?.id);
    });

    setIsParticipating(joined);
    return currentUser;
  };

  useEffect(() => {
    const tournamentId = Number(id);
    let mounted = true;

    Promise.all([
      getContestById(tournamentId),
      getPosts({
        type: "tournament",
        tournamentId,
      }),
      getTournamentRanking(tournamentId),
      loadParticipationState(tournamentId),
    ])
      .then(([contestData, posts, rankingData]) => {
        if (!mounted) return;
        setContest(contestData);
        setSubmissions(Array.isArray(posts) ? posts.slice(0, 4) : []);
        setRanking(Array.isArray(rankingData) ? rankingData.slice(0, 10) : []);
      })
      .catch((error) => {
        console.error("大会詳細データの取得に失敗しました:", error);
        if (!mounted) return;
        setSubmissions([]);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleCancelParticipation = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("現在のユーザー情報を取得できませんでした。");
      }

      await cancelTournamentParticipation(Number(id), currentUser.id);
      setIsParticipating(false);
    } catch (error) {
      console.error("大会参加のキャンセルに失敗しました:", error);
      window.alert(error.message || "大会参加のキャンセルに失敗しました。");
    }
  };

  if (!contest) {
    return (
      <main className="contest-detail-page">
        <header className="contest-detail-topbar">
          <button type="button" onClick={() => navigate(-1)}>
            ‹
          </button>
          <div />
          <button type="button">↗</button>
        </header>

        <div className="contest-detail-empty">
          大会が見つかりません。
        </div>
      </main>
    );
  }

  const isUpcoming = contest.status === "upcoming";
  const isFinished = contest.status === "finished";
  const status = STATUS_LABEL[contest.status] ?? "大会";

  const topRanking = ranking.slice(0, 3);
  const ruleText = contest.rule ?? "";
  return (
    <main className="contest-detail-page">
      <header className="contest-detail-topbar">
        <button type="button" onClick={() => navigate(-1)}>
          ‹
        </button>

        <div />

        <button type="button">↗</button>
      </header>

      <section className="contest-detail-hero">
        <img src={contest.image} alt="" />

        <div className="contest-detail-hero-overlay">
          <div className="contest-detail-badges">
            <span>{status}</span>
            {contest.official && <b>🏆 公式大会</b>}
          </div>

          {contest.number && (
            <p className="contest-detail-number">
              第{contest.number}回
            </p>
          )}

          <h1>{contest.title}</h1>
          <p>{contest.description}</p>

          <div className="contest-detail-meta">
            <div>
              <span>♧</span>
              <strong>{contest.participants ?? 0}人</strong>
              <small>参加者</small>
            </div>

            <i />

            <div>
              <span>◷</span>
              <strong>{contest.remainingText ?? "—"}</strong>
              <small>{isFinished ? "開催終了" : "あと"}</small>
            </div>
          </div>
        </div>
      </section>

      {/* 大会ルール */}
      <section className="contest-detail-card contest-rules-card">
        <h2>大会ルール</h2>

        {ruleText ? (
          <div className="contest-rule-row">
            <div className="rule-icon">📋</div>
            <div>
              <p>{ruleText}</p>
            </div>
          </div>
        ) : (
          <p className="contest-detail-no-data">
            大会ルールは準備中です。
          </p>
        )}
      </section>

      {/* 開催予定はここで終了 */}
      {isUpcoming ? (
        <>
          <section className="contest-detail-card contest-detail-status-card">
            <h2>あなたの状態</h2>

            <div className="contest-detail-status-row">
              <div className="contest-detail-avatar">●</div>

              <div>
                <strong>参加受付前</strong>
                <p>
                  この大会はまだ開催前です。開催開始後に参加できます。
                </p>
              </div>

              <span className="contest-detail-chevron">—</span>
            </div>
          </section>

          <div className="contest-detail-upcoming-note">
            開催前のため、ランキング・みんなの挑戦はまだ表示されません。
          </div>
        </>
      ) : (
        <>
          {/* この大会に参加する */}
          {!isFinished && !isParticipating && (
            <button
              type="button"
              className="contest-detail-join-button"
              onClick={() => navigate(`/post?contestId=${contest.id}`)}
            >
              <span>♡</span>
              この大会に参加する
            </button>
          )}

          {!isFinished && isParticipating && (
            <button
              type="button"
              className="contest-detail-join-button"
              onClick={handleCancelParticipation}
            >
              参加をキャンセルする
            </button>
          )}

          {/* あなたの状態 */}
          <section className="contest-detail-card contest-detail-status-card">
            <h2>あなたの状態</h2>

            <div className="contest-detail-status-row">
              <div className="contest-detail-avatar">●</div>

              <div>
                <strong>
                  {isParticipating || isFinished
                    ? "参加済み"
                    : "まだ参加していません"}
                </strong>

                <p>
                  {isParticipating || isFinished
                    ? isFinished
                      ? "大会結果を確認できます。"
                      : "この大会に参加しています。自分のベスト記録に挑戦しよう！"
                    : contest.type === "vote"
                      ? "今すぐ参加して、みんなの挑戦を見てみよう！"
                      : "今すぐ参加して、自分のベスト記録に挑戦しよう！"}
                </p>
              </div>

              <span className="contest-detail-chevron">›</span>
            </div>
          </section>

          {/* ランキング */}
          <section className="contest-detail-card">
            <div className="contest-detail-section-head">
              <h2>
                ランキング <small>（上位3名）</small>
              </h2>
              <button
                type="button"
                onClick={() => navigate(`/contests/detail/${contest.id}/ranking`)}
              >
                ランキングを見る ›
              </button>
            </div>

            {topRanking.length > 0 ? (
              <div className="contest-ranking">
                {topRanking.map((item) => (
                  <div className="contest-ranking-row" key={item.rank}>
                    <span className={`rank rank-${item.rank}`}>
                      {item.rank}
                    </span>

                    <img src={item.image_url || contest.image} alt="" />

                    <strong>
                      {item.userName ||
                        item.display_name ||
                        `ユーザーID: ${item.userId ?? "不明"}`}
                    </strong>

                    <span className="ranking-score">
                      {item.rank === 1 && <b>♛</b>}
                      {contest.rankingLabel
                        ? `${contest.rankingLabel} ${item.score}`
                        : item.score}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="contest-detail-no-data">
                ランキングデータはありません。
              </p>
            )}
          </section>

          {/* みんなの挑戦 */}
          <section className="contest-detail-card">
            <div className="contest-detail-section-head">
              <h2>みんなの挑戦</h2>
              <button
                type="button"
                className="contest-detail-mode-button"
                onClick={() => navigate(`/contests/detail/${contest.id}/posts`)}
              >
                すべて見る　›
              </button>
            </div>

            {submissions.length > 0 ? (
              <div className="contest-submissions">
                {submissions.map((item) => (
                  <div className="submission" key={item.id}>
                    <div className="submission-image">
                      <img
                        src={item.image_url || contest.image}
                        alt=""
                      />
                      <span>{item.record ?? "—"}</span>
                    </div>

                    <div className="submission-meta">
                      <span>
                        {item.userName ||
                          item.display_name ||
                          `ユーザーID: ${item.userId ?? "不明"}`}
                      </span>
                      <span>♡ {item.likes ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="contest-detail-no-data">
                まだ挑戦した人はいません。
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default ContestDetail;
