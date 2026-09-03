import { NavLink } from "react-router-dom";
import "./BottomNavigation.css";

const navItems = [
  { path: "/", label: "ホーム", key: "home", end: true },
  { path: "/contests", label: "大会", key: "contest" },
  { path: "/post", label: "投稿", key: "post", isCenter: true },
  { path: "/notifications", label: "通知", key: "notification" },
  { path: "/profile", label: "マイページ", key: "profile" },
];

function Icon({ type }) {
  if (type === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5V21h-6v-5H9v5H3z" />
      </svg>
    );
  }

  if (type === "contest") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10v4a5 5 0 0 1-4 4.9V16h3v2H8v-2h3v-3.1A5 5 0 0 1 7 8z" />
        <path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" />
      </svg>
    );
  }

  if (type === "notification") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c.8-4.2 3.2-6 7-6s6.2 1.8 7 6" />
    </svg>
  );
}

function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            [
              "bottom-nav__item",
              item.isCenter ? "bottom-nav__item--center" : "",
              isActive ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")
          }
          aria-label={item.label}
        >
          {item.isCenter ? (
            <span className="bottom-nav__plus" aria-hidden="true">+</span>
          ) : (
            <Icon type={item.key} />
          )}

          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNavigation;
