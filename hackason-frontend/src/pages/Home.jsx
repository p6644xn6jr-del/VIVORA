import Header from "../components/Header";
import FeaturedContest from "../components/FeaturedContest";
import RankingSection from "../components/RankingSection";
import FeedTabs from "../components/FeedTabs";

function Home() {
  return (
    <main className="home">
      <Header />
      <FeaturedContest />
      <RankingSection />
      <FeedTabs />
    </main>
  );
}

export default Home;
