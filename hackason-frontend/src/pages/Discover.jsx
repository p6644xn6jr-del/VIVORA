import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { getRecommendedContests } from "../services/api";
import "./Discover.css";

export default function Discover() {
  const navigate = useNavigate();
  const [recommendedContests, setRecommendedContests] = useState([]);

  useEffect(() => {
    getRecommendedContests()
      .then((data) => setRecommendedContests(Array.isArray(data) ? data : []))
      .catch(() => setRecommendedContests([]));
  }, []);

  return (
    <main className="discover-page sm-page">
      <header className="discover-header">
        <button
          type="button"
          className="discover-back"
          onClick={() => navigate(-1)}
          aria-label="戻る"
        >
          ‹
        </button>

        <div className="discover-title-group">
          <h1>こだわり</h1>
          <p>みんなのこだわりを見てみよう</p>
        </div>

        <span />
      </header>

      <section className="discover-content">
        {recommendedContests.length > 0 && (
          <section className="discover-recommended">
            <div className="discover-section-head">
              <h2>おすすめ大会</h2>
              <span>あなた向け</span>
            </div>

            <div className="discover-contest-strip">
              {recommendedContests.map((contest) => (
                <button
                  type="button"
                  key={contest.id}
                  onClick={() => navigate(`/contests/detail/${contest.id}`)}
                >
                  <img src={contest.image} alt="" />
                  <strong>{contest.title}</strong>
                  <small>{contest.recommendationReason ?? "おすすめ大会"}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="discover-tabs" role="tablist" aria-label="こだわりの投稿">
          <button
            type="button"
            className="discover-tab discover-tab--disabled"
            disabled
            aria-disabled="true"
          >
            <span>おすすめ</span>
            <small>準備中</small>
          </button>

          <button
            type="button"
            className="discover-tab discover-tab--active"
            aria-selected="true"
            role="tab"
          >
            新着
          </button>

          <button
            type="button"
            className="discover-tab discover-tab--disabled"
            disabled
            aria-disabled="true"
          >
            <span>フォロー中</span>
            <small>準備中</small>
          </button>
        </div>

        <div className="discover-posts">
          <PostCard
            sortMode="new"
            type="commitment"
          />
        </div>
      </section>
    </main>
  );
}
