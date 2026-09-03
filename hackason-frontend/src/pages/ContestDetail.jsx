import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getContestById,
  getPosts,
  getCurrentUser,
  getTournamentRanking,
  getTournamentParticipants,
  getTournamentTitle,
  getTournamentEvaluations,
  joinTournament,
  cancelTournamentParticipation,
  finalizeTournament,
  formatScore,
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
  const location = useLocation();
  const rankingRef = useRef(null);
  const evaluationRef = useRef(null);
  const [contest, setContest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [titleAward, setTitleAward] = useState(null);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [finalizeMessage, setFinalizeMessage] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [evaluations, setEvaluations] = useState([]);

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
    return { currentUser, joined };
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
      getTournamentTitle(tournamentId),
      loadParticipationState(tournamentId),
    ])
      .then(([contestData, posts, rankingData, titleData, participation]) => {
        if (!mounted) return;
        setContest(contestData);
        setSubmissions(Array.isArray(posts) ? posts.slice(0, 4) : []);
        setRanking(Array.isArray(rankingData) ? rankingData.slice(0, 10) : []);
        setTitleAward(titleData ?? contestData?.titleAward ?? null);
        setIsParticipating(Boolean(contestData?.joinedByMe) || Boolean(participation?.joined));
        setCurrentUserRank(
          Array.isArray(rankingData)
            ? rankingData.find(
                (item) => Number(item.userId) === Number(participation?.currentUser?.id)
              ) ?? null
            : null
        );

        if (contestData?.evaluationType === "ai") {
          getTournamentEvaluations(tournamentId)
            .then((evaluationData) => {
              if (mounted) setEvaluations(evaluationData.slice(0, 5));
            })
            .catch((error) => {
              console.error("AI評価一覧の取得に失敗しました:", error);
              if (mounted) setEvaluations([]);
            });
        } else {
          setEvaluations([]);
        }

        if (location.state?.postedRecord) {
          setPageMessage("記録を投稿しました。最新ランキングを確認できます。");
          window.history.replaceState({}, "");
          setTimeout(() => {
            const targetRef =
              location.state?.focus === "evaluation" ? evaluationRef : rankingRef;
            targetRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 120);
        }
      })
      .catch((error) => {
        console.error("大会詳細データの取得に失敗しました:", error);
        if (!mounted) return;
        setSubmissions([]);
      });

    return () => {
      mounted = false;
    };
  }, [id, location.state]);

  const handleCancelParticipation = async () => {
    try {
      const result = await cancelTournamentParticipation(Number(id));
      setIsParticipating(false);
      if (typeof result?.participantsCount === "number") {
        setContest((current) =>
          current
            ? {
                ...current,
                participants: result.participantsCount,
                participantsCount: result.participantsCount,
              }
            : current
        );
      }
    } catch (error) {
      console.error("大会参加のキャンセルに失敗しました:", error);
      window.alert(error.message || "大会参加のキャンセルに失敗しました。");
    }
  };

  const handleJoinParticipation = async () => {
    try {
      const result = await joinTournament(Number(id));
      setIsParticipating(true);
      if (typeof result?.participantsCount === "number") {
        setContest((current) =>
          current
            ? {
                ...current,
                participants: result.participantsCount,
                participantsCount: result.participantsCount,
              }
            : current
        );
      }
    } catch (error) {
      console.error("大会参加に失敗しました:", error);
      window.alert(error.message || "大会参加に失敗しました。");
    }
  };

  const handleFinalize = async () => {
    try {
      setFinalizeMessage("");
      const result = await finalizeTournament(Number(id));
      setFinalizeMessage(result.message || "大会結果を確定しました。");
      setRanking(Array.isArray(result.ranking) ? result.ranking.slice(0, 10) : ranking);
      setTitleAward(result.title ?? titleAward);
    } catch (error) {
      console.error("大会結果の確定に失敗しました:", error);
      setFinalizeMessage(error.message || "大会結果の確定に失敗しました。");
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
  const participantCount = contest.participantsCount ?? contest.participants ?? 0;

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
              <strong>{participantCount}人</strong>
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

      <section className="contest-detail-card contest-award-card">
        <div className="contest-detail-section-head">
          <h2>獲得できる称号</h2>
          <small>優勝者に付与</small>
        </div>

        {titleAward?.imageUrl || titleAward?.image_url ? (
          <div className="contest-award-preview">
            <img src={titleAward.imageUrl ?? titleAward.image_url} alt="" />
            <div>
              <strong>{titleAward.name ?? "優勝称号"}</strong>
              <span>{titleAward.description ?? "この大会の1位に贈られる称号です。"}</span>
            </div>
          </div>
        ) : (
          <p className="contest-detail-no-data">
            この大会の称号画像はまだ設定されていません。
          </p>
        )}
      </section>

      <section className="contest-detail-card contest-evaluation-card">
        <h2>評価方法</h2>
        {contest.evaluationType === "ai" ? (
          <>
            <p>投稿画像をAIで評価し、スコアが高いほど上位です。</p>
            <dl className="contest-evaluation-detail">
              <div>
                <dt>評価基準</dt>
                <dd>{contest.aiCriteria || "評価基準は準備中です。"}</dd>
              </div>
              <div>
                <dt>スコア範囲</dt>
                <dd>
                  {contest.aiScoreMin} - {contest.aiScoreMax}
                  {contest.unit || "点"}
                </dd>
              </div>
            </dl>
          </>
        ) : contest.evaluationType === "human_vote" ? (
          <p>みんなの投票によって順位を決める予定の大会です。</p>
        ) : (
          <p>
            {contest.direction === "closest"
              ? `目標 ${contest.target ?? "—"}${contest.unit ?? ""} に最も近い記録が上位です。`
              : contest.direction === "lowest"
                ? `記録が小さいほど上位です。単位: ${contest.unit || "未設定"}`
                : `記録が大きいほど上位です。単位: ${contest.unit || "未設定"}`}
          </p>
        )}
      </section>

      {contest.evaluationType === "ai" && (
        <section className="contest-detail-card contest-ai-status-card" ref={evaluationRef}>
          <div className="contest-detail-section-head">
            <h2>AI評価状況</h2>
            <small>{evaluations.length}件</small>
          </div>

          {evaluations.length > 0 ? (
            <div className="contest-ai-status-list">
              {evaluations.map((evaluation) => (
                <article className="contest-ai-status-row" key={evaluation.id}>
                  <div>
                    <strong>
                      {evaluation.score == null
                        ? "評価待ち"
                        : `${evaluation.score}${contest.unit || "点"}`}
                    </strong>
                    <span>{evaluation.status}</span>
                  </div>
                  <p>
                    {evaluation.feedback ||
                      evaluation.errorMessage ||
                      "AI評価の結果を待っています。"}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="contest-detail-no-data">
              まだAI評価対象の投稿はありません。
            </p>
          )}
        </section>
      )}

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
              onClick={handleJoinParticipation}
            >
              <span>♡</span>
              この大会に参加する
            </button>
          )}

          {pageMessage && (
            <div className="contest-detail-message">
              {pageMessage}
            </div>
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

          {!isFinished && isParticipating && (
            <button
              type="button"
              className="contest-detail-join-button contest-detail-join-button--secondary"
              onClick={() => navigate(`/post?contestId=${contest.id}`)}
            >
              記録を投稿する
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
                  {currentUserRank
                    ? `現在 ${currentUserRank.rank}位 / ${currentUserRank.scoreText ?? formatScore(currentUserRank.score, currentUserRank.decimalPlaces ?? contest.decimalPlaces, currentUserRank.unit ?? contest.unit ?? "")}`
                    : isParticipating || isFinished
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
          <section className="contest-detail-card" ref={rankingRef}>
            <div className="contest-detail-section-head">
              <h2>
                ランキング <small>（上位3名）</small>
              </h2>
              <button type="button">ランキングを見る ›</button>
            </div>

            {topRanking.length > 0 ? (
              <div className="contest-ranking">
                {topRanking.map((item) => (
                  <button
                    type="button"
                    className="contest-ranking-row"
                    key={`${item.rank}-${item.userId}`}
                    onClick={() =>
                      item.userId ? navigate(`/profile/${item.userId}`) : null
                    }
                  >
                    <span className={`rank rank-${item.rank}`}>
                      {item.rank}
                    </span>

                    <img src={item.imageUrl || item.image_url || contest.image} alt="" />

                    <strong>
                      {item.userName ||
                        item.display_name ||
                        `ユーザーID: ${item.userId ?? "不明"}`}
                    </strong>

                    <span className="ranking-score">
                      {item.rank === 1 && <b>♛</b>}
                      {contest.rankingLabel
                        ? `${contest.rankingLabel} ${item.scoreText ?? formatScore(item.score, item.decimalPlaces ?? contest.decimalPlaces, item.unit ?? contest.unit ?? "")}`
                        : item.scoreText ?? formatScore(item.score, item.decimalPlaces ?? contest.decimalPlaces, item.unit ?? contest.unit ?? "")}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="contest-detail-no-data">
                ランキングデータはありません。
              </p>
            )}
          </section>

          {isFinished && (
            <section className="contest-detail-card contest-finalize-card">
              <h2>大会結果</h2>
              <button type="button" onClick={handleFinalize}>
                結果を確定して称号を付与
              </button>
              {finalizeMessage && <p>{finalizeMessage}</p>}
            </section>
          )}

          {/* みんなの挑戦 */}
          <section className="contest-detail-card">
            <div className="contest-detail-section-head">
              <h2>みんなの挑戦</h2>
              <button
                type="button"
                className="contest-detail-mode-button"
                onClick={() => navigate(`/contests/detail/${contest.id}/posts`)}
              >
                すべて見る ›
              </button>
            </div>

            {submissions.length > 0 ? (
              <div className="contest-submissions">
                {submissions.map((item) => (
                  <div className="submission" key={item.id}>
                    <div className="submission-image">
                      <img
                        src={item.image || item.image_url || contest.image}
                        alt=""
                      />
                      <span>
                        {item.record != null
                          ? item.recordText ?? formatScore(item.record, contest.decimalPlaces, contest.unit ?? "")
                          : "—"}
                      </span>
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
