import MatchBar from "./MatchBar";
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

export default function TicketCard({ ticket, onClick }) {
  const isAuto = ticket.status === "auto";
  const reasonLabel = REASON_LABEL[ticket.reason] || ticket.reason;
  const actionLabel = ACTION_LABEL[ticket.chosen_action] || ticket.chosen_action;

  return (
    <button className="ticket-card" onClick={onClick}>
      <div className="ticket-card__top">
        <span className="ticket-card__id mono">{ticket.ticket_id}</span>
        <span
          className="ticket-card__confidence mono"
          style={{ color: isAuto ? "var(--auto)" : "var(--human)" }}
        >
          {Math.round(ticket.confidence * 100)}%
        </span>
      </div>

      <p className="ticket-card__desc">{ticket.description}</p>

      <div className="ticket-card__bottom">
        <span
          className={`ticket-card__action ${isAuto ? "ticket-card__action--auto" : "ticket-card__action--human"}`}
        >
          {actionLabel}
        </span>
        <MatchBar precedents={ticket.precedents} />
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
    </button>
  );
}
