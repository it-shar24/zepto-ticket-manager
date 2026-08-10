import { useState } from "react";
import MatchBar from "./MatchBar";
import GuardrailReceipt from "./GuardrailReceipt";
import NaiveCompare from "./NaiveCompare";
import "./TicketModal.css";

const ACTION_OPTIONS = [
  "full_refund",
  "partial_refund",
  "refund_reissue",
  "redelivery",
  "coupon",
  "apology_no_action",
  "escalation",
];

export default function TicketModal({ ticket, onClose, onOverride }) {
  const [overriding, setOverriding] = useState(false);
  const [chosenAction, setChosenAction] = useState(ticket.chosen_action);
  const [note, setNote] = useState("");

  const isAuto = ticket.status === "auto";

  async function submitOverride() {
    setOverriding(true);
    try {
      await onOverride(ticket.ticket_id, chosenAction, note);
    } finally {
      setOverriding(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <span className="modal__id mono">{ticket.ticket_id}</span>
            <span className={`modal__status ${isAuto ? "modal__status--auto" : "modal__status--human"}`}>
              {isAuto ? "Auto-resolved" : "Needs human"}
            </span>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="modal__desc">{ticket.description}</p>

        {ticket.order && (
          <div className="modal__order mono">
            {ticket.order_id} · ₹{ticket.order.value_inr} · {ticket.order.items} item(s) ·{" "}
            <span style={{ color: ticket.order.delivery_status === "cancelled" ? "var(--blocked)" : "var(--text-secondary)" }}>
              {ticket.order.delivery_status}
            </span>
          </div>
        )}

        {ticket.blocked_by_guardrail && (
          <div className="modal__alert">
            ⛔ Guardrail: <strong>{ticket.blocked_by_guardrail.replaceAll("_", " ")}</strong>
          </div>
        )}

        <div className="modal__section">
          <h3 className="modal__section-title">Confidence</h3>
          <div className="modal__confidence-row">
            <MatchBar precedents={ticket.precedents} size="lg" />
            <div className="modal__confidence-figures mono">
              <div>{Math.round(ticket.confidence * 100)}% overall</div>
              <div className="modal__confidence-sub">
                sim {Math.round(ticket.confidence_breakdown.avg_similarity * 100)}% · agree{" "}
                {Math.round(ticket.confidence_breakdown.agreement_ratio * 100)}%
              </div>
            </div>
          </div>
          <p className="modal__formula mono">
            0.6 × {ticket.confidence_breakdown.avg_similarity.toFixed(2)} + 0.4 ×{" "}
            {ticket.confidence_breakdown.agreement_ratio.toFixed(2)} ={" "}
            <strong>{ticket.confidence.toFixed(2)}</strong>
          </p>
        </div>

        <div className="modal__section">
          <h3 className="modal__section-title">Guardrail checks</h3>
          <GuardrailReceipt ticket={ticket} />
        </div>

        <div className="modal__section">
          <h3 className="modal__section-title">Top-3 precedents</h3>
          <div className="modal__precedents">
            {ticket.precedents.map((p) => (
              <div className="precedent" key={p.ticket_id}>
                <div className="precedent__top">
                  <span className="mono precedent__id">{p.ticket_id}</span>
                  <span className="mono precedent__sim">{Math.round(p.similarity * 100)}%</span>
                </div>
                <p className="precedent__desc">{p.description}</p>
                <div className="precedent__meta">
                  <span className="precedent__action">{p.resolution_action.replaceAll("_", " ")}</span>
                  <span className="precedent__csat">csat {p.csat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal__section">
          <h3 className="modal__section-title">Drafted reply</h3>
          <p className="modal__reply">{ticket.reply}</p>
          <NaiveCompare ticket={ticket} />
        </div>

        {ticket.human_override && (
          <div className="modal__section">
            <h3 className="modal__section-title">Human override</h3>
            <p className="modal__override-note">
              Set to <strong>{ticket.human_override.action.replaceAll("_", " ")}</strong>
              {ticket.human_override.note ? ` — ${ticket.human_override.note}` : ""}
            </p>
          </div>
        )}

        {!isAuto && !ticket.human_override && (
          <div className="modal__section modal__override">
            <h3 className="modal__section-title">Approve / override</h3>
            <div className="modal__override-controls">
              <select
                className="modal__select"
                value={chosenAction}
                onChange={(e) => setChosenAction(e.target.value)}
              >
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a.replaceAll("_", " ")}</option>
                ))}
              </select>
              <input
                className="modal__input"
                placeholder="Optional note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="modal__submit" onClick={submitOverride} disabled={overriding}>
                {overriding ? "Saving…" : "Approve action"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
