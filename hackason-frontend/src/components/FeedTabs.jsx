import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTags } from "../services/api";
import "./FeedTabs.css";

function FeedTabs() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);

  useEffect(() => {
    getTags("popular")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];

        setTags(
          [...list]
            .sort((a, b) => Number(b.postCount ?? 0) - Number(a.postCount ?? 0))
            .slice(0, 5)
        );
      })
      .catch((error) => {
        console.error("人気のこだわり取得に失敗しました:", error);
        setTags([]);
      });
  }, []);

  return (
    <section className="feed" id="feed-section">
      <div className="feed-header">
        <h2>人気のこだわり</h2>

        <button
          type="button"
          className="feed-more"
          onClick={() => navigate("/discover")}
        >
          こだわりモードへ →
        </button>
      </div>

      {tags.length > 0 ? (
        <div className="home-popular-tags">
          {tags.map((tag, index) => {
            const tagName = String(tag.name ?? "").replace(/^#/, "");

            return (
              <button
                type="button"
                className="home-popular-tag"
                key={tag.id ?? tag.name}
                onClick={() =>
                  navigate(`/tags/${encodeURIComponent(tagName)}`)
                }
              >
                <span className="home-popular-rank">{index + 1}</span>

                <span className="home-popular-emoji" aria-hidden="true">
                  {tag.emoji ?? "🏷️"}
                </span>

                <span className="home-popular-info">
                  <strong>#{tagName}</strong>
                  <small>{tag.postCount}件の投稿</small>
                </span>

                <span className="home-popular-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="popular-tags-empty">
          人気のこだわりは準備中です。
        </div>
      )}
    </section>
  );
}

export default FeedTabs;