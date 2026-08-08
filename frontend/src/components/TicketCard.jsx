import ConfidenceRing from "./ConfidenceRing";
import "./TicketCard.css";

const REASON_LABEL = {
  low_confidence: "Low confidence",
  precedents_disagree: "Precedents disagree",
  blocked_by_guardrail: "Blocked by guardrail",
  order_context_missing: "Order context missing",
  no_precedents_found: "No precedent found",
};

const ACTION_LABEL = {
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  refund_reissue: "Refund + reissue",
  redelivery: "Redelivery",
  coupon: "Coupon",
  apology_no_action: "Apology, no action",
  escalation: "Escalation",
};

export default function TicketCard({ ticket, onClick, index = 0 }) {
  const isAuto = ticket.status === "auto";
  const reasonLabel = REASON_LABEL[ticket.reason] || ticket.reason;
  const actionLabel = ACTION_LABEL[ticket.chosen_action] || ticket.chosen_action;
  const tint = ticket.blocked_by_guardrail ? "var(--blocked)" : isAuto ? "var(--auto)" : "var(--human)";

  return (
    <button
      className={`ticket-card ${isAuto ? "ticket-card--auto" : "ticket-card--human"}`}
      onClick={onClick}
      style={{ "--stagger": `${index * 45}ms` }}
    >
      <div className="ticket-card__top">
        <span className="ticket-card__id mono">{ticket.ticket_id}</span>
        <ConfidenceRing value={ticket.confidence} color={tint} size={38} />
      </div>

      <p className="ticket-card__desc">{ticket.description}</p>

      <div className="ticket-card__bottom">
        <span
          className={`ticket-card__action ${isAuto ? "ticket-card__action--auto" : "ticket-card__action--human"}`}
        >
          {actionLabel}
        </span>
        <div className="ticket-card__precedent-dots" title={`${ticket.precedents.length} similar past tickets`}>
          {ticket.precedents.map((p, i) => (
            <span
              key={p.ticket_id || i}
              className="ticket-card__dot"
              style={{ "--strength": p.similarity, "--tint": tint }}
            />
          ))}
        </div>
      </div>

      {!isAuto && reasonLabel && (
        <div
          className={`ticket-card__reason ${
            ticket.blocked_by_guardrail ? "ticket-card__reason--blocked" : ""
          }`}
        >
          {ticket.blocked_by_guardrail ? "⛔" : "◐"} {reasonLabel}
        </div>
      )}

      <span className="ticket-card__glow" style={{ "--tint": tint }} />
    </button>
  );
}
