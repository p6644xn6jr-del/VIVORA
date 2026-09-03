import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPosts, getTagByName } from "../services/api";
import PostCard from "../components/PostCard";
import "./TagDetail.css";

export default function TagDetail() {
  const navigate = useNavigate();
  const { tag } = useParams();
  const name = decodeURIComponent(tag || "");

  const [postCount, setPostCount] = useState(null);
  const [activeTab, setActiveTab] = useState("おすすめ");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    getTagByName(name)
      .then((tagData) => {
        if (!mounted) return;
        setPostCount(tagData ? Number(tagData.postCount ?? 0) : 0);
      })
      .catch((err) => {
        console.error("タグの投稿数取得に失敗しました:", err);

        if (mounted) {
          setPostCount(null);
          setError("投稿数を取得できませんでした。");
        }
      });

    return () => {
      mounted = false;
    };
  }, [name]);

  const goPost = () => {
    navigate(`/post?tag=${encodeURIComponent(name)}`);
  };

  return (
    <main className="tag-detail-page sm-page">
      <header className="tag-detail-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="戻る">
          ‹
        </button>

        <div>
          <h1>#{name}</h1>
          <p>{name}の投稿</p>
        </div>

        <div />
      </header>

      <section className="tag-detail-summary">
        <div>
          <span>投稿</span>
          <strong>
            {postCount == null ? "準備中です" : `${postCount}件`}
          </strong>
        </div>

        <div>
          <span>ランキング</span>
          <strong>準備中です</strong>
        </div>

        <button type="button" onClick={goPost}>
          ＋ このタグで投稿する
        </button>
      </section>

      {error && <p className="tag-detail-error">{error}</p>}

      <div className="tag-detail-tabs" role="tablist" aria-label="タグ投稿">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "おすすめ"}
          className={`tag-detail-tab ${
            activeTab === "おすすめ" ? "active" : ""
          }`}
          onClick={() => setActiveTab("おすすめ")}
        >
          おすすめ
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "新着"}
          className={`tag-detail-tab ${
            activeTab === "新着" ? "active" : ""
          }`}
          onClick={() => setActiveTab("新着")}
        >
          新着
        </button>
      </div>

      <section className="tag-posts">
        {activeTab === "おすすめ" ? (
          <div className="contest-empty">
            「おすすめ」は準備中です。
          </div>
        ) : (
          <PostCard key={`tag-new-${name}`} tag={name} sortMode="new" />
        )}
      </section>
    </main>
  );
}
