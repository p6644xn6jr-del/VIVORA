
import { useNavigate } from "react-router-dom";
import "../styles/design-system.css";

function PageHeader({ title, subtitle }) {
  const navigate = useNavigate();

  return (
    <header className="sm-header">
      <button
        type="button"
        className="sm-header__back"
        onClick={() => navigate(-1)}
        aria-label="戻る"
      >
        ‹
      </button>

      <div>
        <h1 className="sm-header__title">{title}</h1>
        {subtitle && (
          <p className="sm-header__subtitle">{subtitle}</p>
        )}
      </div>

      <div className="sm-header__side" />
    </header>
  );
}

export default PageHeader;
