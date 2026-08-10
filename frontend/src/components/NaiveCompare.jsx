import { useState } from "react";
import "./NaiveCompare.css";

const ACTION_LABEL = {
  full_refund: "full refund",
  partial_refund: "partial refund",
  refund_reissue: "refund + reissue",
  redelivery: "redelivery",
  coupon: "coupon",
  apology_no_action: "apology, no action",
  escalation: "escalation",
};

function naiveGuess(ticket) {
  const topAction = ticket.precedents?.[0]?.resolution_action;
  const label = ACTION_LABEL[topAction] || topAction || "an action";

  if (ticket.blocked_by_guardrail === "cancelled_order_blocks_redelivery") {
    return `Sees "redelivery" on the closest precedent and just sends it — no check that this order is already cancelled.`;
  }
  if (ticket.blocked_by_guardrail === "no_order_value_to_refund_against") {
    return `Issues a refund because the top precedent did — with no order value on file to cap it against.`;
  }
  if (ticket.reason === "precedents_disagree") {
    return `Picks whichever of the top-3 precedents it saw first (${label}) and commits to it, even though the other two disagree.`;
  }
  return `Reads the top precedent, decides on "${label}", and writes the customer reply in the same step — one model call, no separate check.`;
}

export default function NaiveCompare({ ticket }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="naive-compare">
      <button className="naive-compare__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "Compare vs. a naive LLM wrapper"}
      </button>

      {open && (
        <div className="naive-compare__grid">
          <div className="naive-compare__col naive-compare__col--naive">
            <span className="naive-compare__col-label">✕ Naive wrapper</span>
            <p>{naiveGuess(ticket)}</p>
          </div>
          <div className="naive-compare__col naive-compare__col--ours">
            <span className="naive-compare__col-label">✓ This system</span>
            <p>
              Action came from precedent + guardrails first. The model only drafted the
              reply text below, after the decision was already locked in.
            </p>
          </div>
          <p className="naive-compare__caption">
            Illustrative side-by-side, not a live second model call — built to make slide
            8's argument concrete on this exact ticket.
          </p>
        </div>
      )}
    </div>
  );
}
