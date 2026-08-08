import "./Header.css";

export default function Header({ onProcess, processing, hasResults, counts }) {
  return (
    <header className="header">
      <div className="header__identity">
        <div className="header__mark">
          <span>Z</span>
        </div>
        <div>
          <h1 className="header__title">Ticket Resolution Console</h1>
          <p className="header__subtitle">
            Matches every new ticket against resolved history and drafts the reply.
          </p>
        </div>
      </div>

      <div className="header__right">
        {hasResults && (
          <div className="header__counts">
            <span className="header__count header__count--auto">
              <span className="header__count-dot" />
              <em>{counts.auto}</em> auto
            </span>
            <span className="header__count header__count--human">
              <span className="header__count-dot" />
              <em>{counts.human}</em> human
            </span>
          </div>
        )}
        <button
          className={`header__button ${processing ? "header__button--busy" : ""}`}
          onClick={onProcess}
          disabled={processing}
        >
          <span className="header__button-label">
            {processing ? "Processing…" : hasResults ? "Reprocess" : "Process Tickets"}
          </span>
        </button>
      </div>
    </header>
  );
}
