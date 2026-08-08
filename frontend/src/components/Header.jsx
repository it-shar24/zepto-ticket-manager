import "./Header.css";

export default function Header({ onProcess, processing, hasResults, counts }) {
  return (
    <header className="header">
      <div className="header__identity">
        <div className="header__mark">ZQ</div>
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
            <span className="header__count">
              <em style={{ color: "var(--auto)" }}>{counts.auto}</em> auto-resolved
            </span>
            <span className="header__count">
              <em style={{ color: "var(--human)" }}>{counts.human}</em> needs human
            </span>
          </div>
        )}
        <button
          className="header__button"
          onClick={onProcess}
          disabled={processing}
        >
          {processing ? "Processing…" : hasResults ? "Reprocess" : "Process Tickets"}
        </button>
      </div>
    </header>
  );
}
