import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import "./Discover.css";

export default function Discover() {
  const navigate = useNavigate();

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
