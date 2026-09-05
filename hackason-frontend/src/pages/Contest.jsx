import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getContests, getPopularContests, getJoinedContests } from "../services/api";
import "./Contest.css";

const STATUS = {
  active: "active",
  upcoming: "upcoming",
  finished: "finished",
};

const STATUS_LABEL = {
  active: "開催中",
  upcoming: "開催予定",
  finished: "結果",
};

function Contest() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") ?? "all";

  const initialStatus = searchParams.get("status");
  const [status, setStatus] = useState(
    initialStatus && Object.values(STATUS).includes(initialStatus)
      ? initialStatus
      : STATUS.active
  );
  const [contests, setContests] = useState([]);
  const [popularContests, setPopularContests] = useState([]);
  const [joined, setJoined] = useState([]);

  useEffect(() => {
    Promise.all([getContests(), getPopularContests(), getJoinedContests()])
      .then(([contestData, popularData, joinedData]) => {
        setContests(Array.isArray(contestData) ? contestData : []);
        setPopularContests(Array.isArray(popularData) ? popularData : []);
        setJoined(Array.isArray(joinedData) ? joinedData : []);
      })
      .catch((error) => {
        console.error("大会データの取得に失敗しました:", error);
      });
  }, []);
  const visibleContests = contests.filter((contest) => contest.status === status);

  const changeStatus = (nextStatus) => {
    setStatus(nextStatus);

    const params = new URLSearchParams(searchParams);
    params.set("status", nextStatus);
    setSearchParams(params, { replace: true });
  };

  const goDetail = (id) => {
    navigate(`/contests/detail/${id}`);
  };

  const renderActive = () => {
    const featured =
      visibleContests.find((contest) => contest.official) ??
      visibleContests[0];

    const officialContests = visibleContests
      .filter(
        (contest) =>
          contest.official && contest.id !== featured?.id
      )
      .slice(0, 3);

    const popular = popularContests
      .filter(
        (contest) =>
          contest.status === status && contest.id !== featured?.id
      )
      .sort((a, b) => Number(b.participants ?? 0) - Number(a.participants ?? 0))
      .slice(0, 4);

    if (view === "official") {
      return (
        <section className="contest-section">
          <div className="contest-section-title">
            <h2>🏆 注目の公式大会</h2>
          </div>

          <div className="official-list">
            {visibleContests.filter((contest) => contest.official).length > 0 ? (
              visibleContests
                .filter((contest) => contest.official)
                .map((contest) => (
                <button
                  type="button"
                  className="official-card"
                  key={contest.id}
                  onClick={() => goDetail(contest.id)}
                >
                  <img src={contest.image} alt="" />
                  <div>
                    <div className="official-badges">
                      <span>開催中</span>
                      <b>公式大会</b>
                    </div>
                    <h3>{contest.title}</h3>
                    <p>{contest.description}</p>
                    <small>◷ {contest.remainingText ?? ""}　♧ {contest.participants ?? 0}人</small>
                  </div>
                  <strong>›</strong>
                </button>
              ))
            ) : (
              <div className="contest-empty">注目の大会はありません。</div>
            )}
          </div>
        </section>
      );
    }

    if (view === "popular") {
      return (
        <section className="contest-section">
          <div className="contest-section-title">
            <h2>🔥 人気の大会</h2>
          </div>

          <div className="popular-grid">
            {popularContests.filter((contest) => contest.status === status).length > 0 ? (
              popularContests
                .filter((contest) => contest.status === status)
                .sort((a, b) => Number(b.participants ?? 0) - Number(a.participants ?? 0))
                .map((contest) => (
                <button
                  type="button"
                  className="popular-card"
                  key={contest.id}
                  onClick={() => goDetail(contest.id)}
                >
                  <img src={contest.image} alt="" />
                  <div>
                    <h3>{contest.title}</h3>
                    <p>{contest.description}</p>
                    <small>◷ {contest.remainingText ?? ""}　♧ {contest.participants ?? 0}人</small>
                  </div>
                  <strong>›</strong>
                </button>
              ))
            ) : (
              <div className="contest-empty">人気の大会はありません。</div>
            )}
          </div>
        </section>
      );
    }

    if (!featured) {
      return (
        <div className="contest-empty">
          "開催中の大会はありません。"
        </div>
      );
    }

    return (
      <>
        <section className="contest-featured">
          <img src={featured.image} alt="" />

          <div className="contest-featured-overlay">
            <div className="contest-featured-badges">
              <span>開催中</span>
              {featured.official && <b>🏆 公式大会</b>}
            </div>

            <p className="contest-featured-number">
              第{featured.number ?? 1}回
            </p>

            <h2>{featured.title}</h2>
            <p>{featured.description}</p>

            <div className="contest-featured-meta">
              <span>♧ {featured.participants ?? 0}人</span>
              <span>◷ {featured.remainingText ?? ""}</span>
            </div>

            <button
              type="button"
              onClick={() => goDetail(featured.id)}
            >
              大会を見る　›
            </button>
          </div>
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>
              🏆 あなたが参加中
              <i>{joined.length}</i>
            </h2>

            <button
              type="button"
              onClick={() => navigate("/contests/joined")}
            >
              すべて見る　›
            </button>
          </div>

          {joined.length > 0 ? (
            <button
              type="button"
              className="joined-card"
              onClick={() => goDetail(joined[0].id)}
            >
              <img src={joined[0].image} alt="" />

              <div className="joined-card-content">
                <div className="joined-badges">
                  <span>
                    {STATUS_LABEL[joined[0].status] ?? "開催中"}
                  </span>
                  {joined[0].official && <b>公式大会</b>}
                </div>

                <h3>{joined[0].title}</h3>
                <p>{joined[0].description}</p>

                <small>
                  ♧ {joined[0].participants ?? 0}人参加　◷{" "}
                  {joined[0].remainingText ?? ""}
                </small>
              </div>

              <div className="joined-score">
                <span>あなたのベスト</span>
                <strong>{joined[0].myBestScore ?? "—"}</strong>
                <b>›</b>
              </div>
            </button>
          ) : (
            <div className="contest-empty">参加中の大会はありません。</div>
          )}
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>🏆 注目の公式大会</h2>
            <button
              type="button"
              onClick={() => navigate("/contests?status=active&view=official")}
            >
              すべて見る　›
            </button>
          </div>

          <div className="official-list">
            {officialContests.length > 0 ? (
              officialContests.map((contest) => (
                <button
                  type="button"
                  className="official-card"
                  key={contest.id}
                  onClick={() => goDetail(contest.id)}
                >
                  <img src={contest.image} alt="" />

                  <div>
                    <div className="official-badges">
                      <span>開催中</span>
                      <b>公式大会</b>
                    </div>

                    <h3>{contest.title}</h3>
                    <p>{contest.description}</p>

                    <small>
                      ◷ {contest.remainingText ?? ""}　♧{" "}
                      {contest.participants ?? 0}人
                    </small>
                  </div>

                  <strong>›</strong>
                </button>
              ))
            ) : (
              <div className="contest-empty">注目の大会はありません。</div>
            )}
          </div>
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>🔥 人気の大会</h2>
            <button
              type="button"
              onClick={() => navigate("/contests?status=active&view=popular")}
            >
              すべて見る　›
            </button>
          </div>

          <div className="popular-grid">
            {popular.length > 0 ? (
              popular.map((contest) => (
                <button
                  type="button"
                  className="popular-card"
                  key={contest.id}
                  onClick={() => goDetail(contest.id)}
                >
                  <img src={contest.image} alt="" />

                  <div>
                    <h3>{contest.title}</h3>
                    <p>{contest.description}</p>
                    <small>
                      ◷ {contest.remainingText ?? ""}　♧{" "}
                      {contest.participants ?? 0}人
                    </small>
                  </div>

                  <strong>›</strong>
                </button>
              ))
            ) : (
              <div className="contest-empty">人気の大会はありません。</div>
            )}
          </div>
        </section>
      </>
    );
  };

  const renderUpcoming = () => {
    const featured =
      visibleContests.find((contest) => contest.official) ??
      visibleContests[0];

    if (!featured) {
      return (
        <div className="contest-empty">
          "開催予定の大会はありません。"
        </div>
      );
    }

    return (
      <>
        <section className="contest-featured">
          <img src={featured.image} alt="" />

          <div className="contest-featured-overlay">
            <div className="contest-featured-badges">
              <span className="next-event-badge">NEXT EVENT</span>
            </div>

            <p className="contest-featured-number">
              第{featured.number ?? 2}回
            </p>

            <h2>{featured.title}</h2>
            <p>{featured.description}</p>

            <div className="upcoming-featured-meta">
              <span>◷ {featured.remainingText ?? "近日開催"}</span>
              {featured.startAt && (
                <span>▣ {featured.startAt} START</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => goDetail(featured.id)}
            >
              大会の詳細を見る　›
            </button>
          </div>
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>🏆 もうすぐ開催</h2>
          </div>

          <div className="official-list">
            {visibleContests
              .filter((contest) => contest.id !== featured?.id)
              .map((contest) => (
              <button
                type="button"
                className="official-card"
                key={contest.id}
                onClick={() => goDetail(contest.id)}
              >
                <img src={contest.image} alt="" />

                <div>
                  <div className="official-badges">
                    <span>公式</span>
                    {contest.joinStatus && (
                      <b>{contest.joinStatus}</b>
                    )}
                  </div>

                  <h3>{contest.title}</h3>
                  <p>{contest.description}</p>

                  <small>
                    ◷{" "}
                    {contest.startAt
                      ? `${contest.startAt} START`
                      : contest.remainingText ?? "近日開催"}
                  </small>
                </div>

                <strong>›</strong>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  };

  const renderResults = () => {
    const recent = visibleContests.slice(0, 2);
    const winners = visibleContests.slice(0, 2);
    const history = visibleContests.slice(2, 5);

    if (visibleContests.length === 0) {
      return (
        <div className="contest-empty">
          "大会の結果はありません。"
        </div>
      );
    }

    return (
      <>
        <section className="contest-section results-first-section">
          <div className="contest-section-title">
            <h2>♙ あなたの最近の結果</h2>
            <button type="button">すべて見る　›</button>
          </div>

          <div className="result-list">
            {recent.map((contest, index) => (
              <button
                type="button"
                className="result-card"
                key={contest.id}
                onClick={() => goDetail(contest.id)}
              >
                <div className="result-card-image">
                  <img src={contest.image} alt="" />
                </div>

                <div className="result-card-content">
                  <span className="result-joined-badge">
                    参加済み
                  </span>

                  <h3>{contest.title}</h3>

                  <p className="result-rank">
                    <strong>{contest.myRank ?? index + 1}</strong>
                    <span>
                      位 / {contest.participants ?? 0}人
                    </span>
                  </p>

                  <small>
                    ◷ 開催期間 {contest.period ?? "—"}
                  </small>
                </div>

                <div className="result-card-score">
                  <span>
                    {contest.myBestScore != null
                      ? "自己ベスト"
                      : "結果"}
                  </span>
                  <strong>{contest.myBestScore ?? "—"}</strong>
                  <b>›</b>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>♕ 歴代受賞者</h2>
            <button type="button">すべて見る　›</button>
          </div>

          <div className="winner-grid">
            {winners.map((contest, index) => (
              <button
                type="button"
                className="winner-card"
                key={`winner-${contest.id}`}
                onClick={() => goDetail(contest.id)}
              >
                <div className="winner-rank">1</div>
                <img src={contest.image} alt="" />
                <h3>{contest.title}</h3>

                <span className="winner-user">
                  @{contest.winnerName ??
                    (index === 0 ? "egg_master" : "just_one")}
                </span>

                <p>
                  {contest.winnerScore ??
                    contest.myBestScore ??
                    "—"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="contest-section">
          <div className="contest-section-title">
            <h2>◷ 過去大会</h2>
            <button type="button">すべて見る　›</button>
          </div>

          <div className="history-list">
            {history.map((contest) => (
              <button
                type="button"
                className="history-card"
                key={contest.id}
                onClick={() => goDetail(contest.id)}
              >
                <img src={contest.image} alt="" />

                <div>
                  <h3>{contest.title}</h3>
                  <small>
                    ▣ {contest.period ?? "開催終了"}
                  </small>
                </div>

                <strong>結果を見る　›</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="result-summary">
          <div>
            <span>参加大会</span>
            <strong>
              {joined.length + visibleContests.length}
            </strong>
            <small>回</small>
          </div>

          <div>
            <span>獲得称号</span>
            <strong>
              {visibleContests.filter(
                (contest) => contest.winnerName
              ).length}
            </strong>
            <small>個</small>
          </div>

          <div>
            <span>ベスト順位</span>
            <strong>
              {Math.min(
                ...visibleContests
                  .map((contest) => contest.myRank ?? 999)
                  .concat([999])
              )}
            </strong>
            <small>位</small>
          </div>
        </section>
      </>
    );
  };

  return (
    <main className="contest-page">
      <header className="contest-header">
        <h1>大会</h1>
      </header>

      <div className="contest-tabs">
        <button
          type="button"
          className={status === STATUS.active ? "active" : ""}
          onClick={() => changeStatus(STATUS.active)}
        >
          開催中
        </button>

        <button
          type="button"
          className={status === STATUS.upcoming ? "active" : ""}
          onClick={() => changeStatus(STATUS.upcoming)}
        >
          開催予定
        </button>

        <button
          type="button"
          className={status === STATUS.finished ? "active" : ""}
          onClick={() => changeStatus(STATUS.finished)}
        >
          結果
        </button>
      </div>

      {status === STATUS.active && renderActive()}
      {status === STATUS.upcoming && renderUpcoming()}
      {status === STATUS.finished && renderResults()}
    </main>
  );
}

export default Contest;
