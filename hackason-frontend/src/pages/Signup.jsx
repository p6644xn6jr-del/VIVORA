import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../services/api";

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [ageVisibility, setAgeVisibility] = useState(false);
  const [area, setArea] = useState("");
  const [profile, setProfile] = useState("");
  const [icon, setIcon] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (!email) {
      alert("メールアドレスを入力してください。");
      return;
    }
    if (!password) {
      alert("パスワードを入力してください。");
      return;
    }
    if (!confirmPassword) {
      alert("パスワードを確認してください。");
      return;
    }
    if (password !== confirmPassword) {
      alert("パスワードが一致しません。");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      alert("名前を入力してください。");
      return;
    }
    if (!birthday) {
      alert("生年月日を入力してください。");
      return;
    }
    if (!area) {
      alert("地域を入力してください。");
      return;
    }
    if (!profile) {
      alert("自己紹介を入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      alert("パスワードが一致しません。");
      return;
    }

    try {
      setLoading(true);

      const result = await signup({
        email,
        password,
        name,
        birthday,
        ageVisibility,
        area,
        profile,
        icon,
      });

      console.log("登録成功:", result);
      alert("登録成功！ログインしてください。");
      navigate("/login");
    } catch (error) {
      console.error("登録に失敗しました:", error);
      alert(error.message || "登録に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <>
          <h1>Contest SNS</h1>
          <form>
            <h2>アカウント作成</h2>

            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label htmlFor="confirmPassword">パスワード（確認）</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="パスワード（確認）"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button type="button" onClick={handleNext}>
              次へ
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h1>Contest SNS</h1>
          <form onSubmit={handleSubmit}>
            <h2>プロフィール設定</h2>

            <label htmlFor="name">名前</label>
            <input
              id="name"
              type="text"
              placeholder="名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="birthday">生年月日</label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />

            <label htmlFor="area">地域</label>
            <input
              id="area"
              type="text"
              placeholder="地域"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />

            <label htmlFor="profile">自己紹介</label>
            <textarea
              id="profile"
              maxLength={100}
              placeholder="自己紹介"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            />
            <p>{profile.length}/100</p>

            <label htmlFor="icon">アイコン</label>
            <input
              id="icon"
              type="file"
              accept="image/*"
              onChange={(e) => setIcon(e.target.files?.[0] ?? null)}
            />

            <label>
              <input
                type="checkbox"
                checked={ageVisibility}
                onChange={(e) => setAgeVisibility(e.target.checked)}
              />
              年齢を公開する
            </label>

            <br />
            <br />

            <button type="button" onClick={() => setStep(1)} disabled={loading}>
              戻る
            </button>
            <button type="submit" disabled={loading}>
              {loading ? "登録中..." : "登録する"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default Signup;
