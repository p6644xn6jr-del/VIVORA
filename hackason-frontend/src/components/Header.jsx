import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";
import logo from "../assets/logo.png";

function Header() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState(null);
  const { signOut } = useAuth();

  const closePanel = () => setPanel(null);

  return (
    <>
      <header className="header">
        <div className="logo-area">
          <img src={logo} alt="VIVORA" className="logo-icon" />
          <h1 className="logo">VIVORA</h1>
        </div>

        <div className="header-icons">
          <button
            type="button"
            aria-label="マイページ"
            aria-expanded={panel === "profile"}
            onClick={() => setPanel(panel === "profile" ? null : "profile")}
          >
            <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11.5" cy="11.5" r="11.5" fill="#D9D9D9" />
            </svg>
          </button>
          <button
            type="button"
            className="header-logout"
            onClick={() => {
              signOut();
              setPanel(null);
              navigate("/login", { replace: true });
            }}
          >
            ログアウト
          </button>
        </div>
      </header>

      {panel && (
        <div className="header-panel-backdrop" role="presentation" onClick={closePanel}>
          <div className="header-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="header-panel-close" onClick={closePanel} aria-label="閉じる">
              ×
            </button>

            {panel === "notifications" ? (
              <>
                <h2>通知</h2>
                <p>新しい通知はありません。</p>
              </>
            ) : (
              <>
                <h2>マイページ</h2>
                <p>プロフィール画面はこれから実装します。</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
