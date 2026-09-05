import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getContests } from "../services/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "./FeaturedContest.css";

function FeaturedContest() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getContests()
      .then((data) => {
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];

        // 開催中の大会を基準にする。
        // 公式フラグが正しく返ってくる場合は公式大会を優先し、
        // フラグが無い/形式が違う場合でも開催中の大会が消えないようにする。
        const activeContests = list.filter(
          (contest) =>
            contest.status === "active" ||
            contest.status === "開催中"
        );

        const officialActive = activeContests.filter(
          (contest) =>
            contest.official === true ||
            contest.official === 1 ||
            contest.official === "true"
        );

        setContests(
          (officialActive.length > 0 ? officialActive : activeContests)
            .slice(0, 5)
        );
      })
      .catch((error) => {
        console.error("開催中の公式大会の取得に失敗しました:", error);

        if (mounted) {
          setContests([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="featured">
      <div className="featured-header">
        <h2>開催中の公式大会</h2>

        <button
          type="button"
          className="more-btn"
          onClick={() => navigate("/contests")}
        >
          大会モードへ →
        </button>
      </div>

      {loading ? (
        <div className="contest-empty">大会を読み込んでいます…</div>
      ) : contests.length === 0 ? (
        <div className="contest-empty">
          現在、開催中の公式大会はありません。
        </div>
      ) : (
        <Swiper
          modules={[Pagination]}
          pagination={{ clickable: true }}
          spaceBetween={16}
        >
          {contests.map((contest) => (
            <SwiperSlide key={contest.id}>
              <button
                type="button"
                className="contest-card"
                onClick={() =>
                  navigate(`/contests/detail/${contest.id}`)
                }
              >
                <img
                  src={contest.image}
                  alt={contest.title}
                  className="contest-image"
                />

                <div className="contest-overlay">
                  <span className="contest-badge">
                    開催中
                    {(contest.official === true ||
                      contest.official === 1 ||
                      contest.official === "true") && (
                      <b>公式</b>
                    )}
                  </span>

                  <h3>{contest.title}</h3>

                  <p>
                    {contest.description}
                  </p>

                  <div className="contest-footer">
                    <div className="contest-users">
                      ♧ {contest.participants ?? "準備中"}人
                    </div>

                    <span className="join-btn">
                      大会を見る →
                    </span>
                  </div>
                </div>
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}

export default FeaturedContest;
