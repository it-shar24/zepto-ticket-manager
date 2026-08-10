import "./GuardrailReceipt.css";

/**
 * Renders the three guardrail checks from slide 6 as a pass/fail checklist
 * for this specific ticket. Every status here is derived from fields the
 * API already returns (blocked_by_guardrail, reason, confidence_breakdown) —
 * nothing is invented on the frontend.
 */
export default function GuardrailReceipt({ ticket }) {
  const agreementRatio = ticket.confidence_breakdown?.agreement_ratio ?? 0;

  const checks = [
    {
      label: "Cancelled order never triggers a redelivery",
      pass: ticket.blocked_by_guardrail !== "cancelled_order_blocks_redelivery",
      note:
        ticket.blocked_by_guardrail === "cancelled_order_blocks_redelivery"
          ? "order was cancelled — redelivery blocked"
          : null,
    },
    {
      label: "Refund capped at the order's own value",
      pass: ticket.blocked_by_guardrail !== "no_order_value_to_refund_against",
      note:
        ticket.blocked_by_guardrail === "no_order_value_to_refund_against"
          ? "no order value to refund against"
          : ticket.simulated_refund_inr != null
          ? `capped at ₹${ticket.simulated_refund_inr}`
          : null,
    },
    {
      label: "Top-3 precedents must agree, or it's queued",
      pass: ticket.reason !== "precedents_disagree",
      note:
        ticket.reason === "precedents_disagree"
          ? `only ${Math.round(agreementRatio * 100)}% agreement`
          : `${Math.round(agreementRatio * 100)}% agreement`,
    },
  ];

  return (
    <ul className="guardrail-receipt">
      {checks.map((c, i) => (
        <li
          key={i}
          className={`guardrail-receipt__row ${c.pass ? "guardrail-receipt__row--pass" : "guardrail-receipt__row--fail"}`}
          style={{ "--stagger": `${i * 90}ms` }}
        >
          <span className="guardrail-receipt__icon">{c.pass ? "✓" : "✕"}</span>
          <span className="guardrail-receipt__label">{c.label}</span>
          {c.note && <span className="guardrail-receipt__note mono">{c.note}</span>}
        </li>
      ))}
    </ul>
  );
}
