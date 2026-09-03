import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTitleAwardById } from "../services/api";
import "./TitleDetail.css";

function TitleDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [title, setTitle] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    getTitleAwardById(id)
      .then((data) => {
        if (!mounted) return;

        if (!data) {
          setError("称号が見つかりません。");
          return;
        }

        setTitle(data);
      })
      .catch((err) => {
        console.error("称号詳細の取得に失敗しました:", err);
        if (mounted) {
          setError(err.message || "称号詳細を取得できませんでした。");
        }
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="title-detail-page">
        <button
          type="button"
          className="title-detail-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <p className="title-detail-state">{error}</p>
      </main>
    );
  }

  if (!title) {
    return (
      <main className="title-detail-page">
        <button
          type="button"
          className="title-detail-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <p className="title-detail-state">称号を読み込んでいます…</p>
      </main>
    );
  }

  return (
    <main className="title-detail-page">
      <button
        type="button"
        className="title-detail-back"
        onClick={() => navigate(-1)}
        aria-label="戻る"
      >
        ‹
      </button>

      <section className="title-detail-hero">
        <img src={title.imageUrl} alt="" />
        <span>{title.rarity}</span>
      </section>

      <section className="title-detail-body">
        <p>獲得称号</p>
        <h1>{title.name}</h1>
        <span>{title.description || "大会の結果として獲得した画像称号です。"}</span>

        <div className="title-detail-meta">
          <button
            type="button"
            onClick={() => navigate(`/contests/detail/${title.tournamentId}`)}
          >
            <small>大会</small>
            <strong>{title.tournamentTitle || "大会"}</strong>
          </button>

          <div>
            <small>順位</small>
            <strong>{title.rank}位</strong>
          </div>

          <div>
            <small>記録</small>
            <strong>
              {title.score == null ? "—" : `${title.score}${title.unit ?? ""}`}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/profile/${title.userId}`)}
          >
            <small>獲得者</small>
            <strong>ユーザーID {title.userId}</strong>
          </button>
        </div>
      </section>
    </main>
  );
}

export default TitleDetail;
