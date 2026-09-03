import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Contest from "./pages/Contest";
import ContestDetail from "./pages/ContestDetail";
import ContestPosts from "./pages/ContestPosts";
import Post from "./pages/Post";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import TagDetail from "./pages/TagDetail";
import Login from "./pages/Login";
import BottomNavigation from "./components/BottomNavigation";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />

          <Route path="/tags/:tag" element={<TagDetail />} />

          <Route path="/contests" element={<Contest />} />
          <Route path="/contests/detail/:id" element={<ContestDetail />} />
          <Route path="/contests/detail/:id/posts" element={<ContestPosts />} />
          <Route path="/post" element={<Post />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <BottomNavigation />
      </div>
    </BrowserRouter>
  );
}

export default App;
