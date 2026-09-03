import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../services/api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setLoading(true);

      await login(email.trim(), password);

      const destination = location.state?.from || "/";
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("ログインに失敗しました:", err);
      setError(err.message || "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="login-brand__mark">V</span>
          <span className="login-brand__name">VIVORA</span>
        </div>

        <div className="login-heading">
          <p className="login-eyebrow">CONTEST SNS</p>
          <h1>ログイン</h1>
          <p>メールアドレスとパスワードでログイン。</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@example.com"
            disabled={loading}
          />

          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="パスワード"
            disabled={loading}
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="login-note">
          Supabase Authを使ってログインします。
        </p>

        <button
          type="button"
          className="login-link-button"
          onClick={() => navigate("/signup")}
        >
          アカウントを作成する
        </button>
      </section>
    </main>
  );
}

export default Login;
