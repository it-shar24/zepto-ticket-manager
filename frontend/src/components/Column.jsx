import TicketCard from "./TicketCard";
import "./Column.css";

export default function Column({ title, tint, tickets, onSelect, emptyLabel }) {
  return (
    <section className="column">
      <div className="column__head">
        <span className="column__dot" style={{ background: `var(--${tint})` }} />
        <h2 className="column__title">{title}</h2>
        <span className="column__count mono">{tickets.length}</span>
      </div>

      <div className="column__list">
        {tickets.length === 0 && (
          <p className="column__empty">{emptyLabel}</p>
        )}
        {tickets.map((t) => (
          <TicketCard key={t.ticket_id} ticket={t} onClick={() => onSelect(t)} />
        ))}
      </div>
    </section>
  );
}
