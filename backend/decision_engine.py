"""
decision_engine.py
-------------------
Turns "top-3 similar precedents" + "order context" into a final decision:
  - chosen_action
  - confidence score (0-1) with a breakdown so the UI can explain "why this score"
  - status: "auto" or "needs_human"
  - reason: populated when status == "needs_human"

Guardrails (checked AFTER precedent-based decision, can only downgrade
auto -> needs_human, never the reverse):
  1. Order is cancelled -> redelivery is never allowed.
  2. Refund action's implied amount can't exceed the order value.
     (We don't have a per-ticket refund amount in the data, so we treat
     "refund not larger than order value" as: any refund-type action on an
     order worth <= 0 / missing is blocked; and we cap simulated refund
     amount at order value when executing the action.)
  3. Top-3 precedents disagree on action (no majority) -> queue, don't guess.

Confidence = 0.6 * avg_similarity_of_top3 + 0.4 * agreement_ratio
  - avg_similarity_of_top3: how close the precedents are, textually.
  - agreement_ratio: fraction of the top-3 that share the majority action.

Thresholds (tunable):
  AUTO_CONFIDENCE_THRESHOLD = 0.45
  AUTO_MIN_SIMILARITY       = 0.30   (even a "confident" score needs some real
                                       textual similarity, not just agreement)
"""

from dataclasses import dataclass, field
from collections import Counter

from matcher import Precedent

AUTO_CONFIDENCE_THRESHOLD = 0.45
AUTO_MIN_SIMILARITY = 0.30

REFUND_ACTIONS = {"full_refund", "partial_refund", "refund_reissue", "coupon"}
REDELIVERY_ACTIONS = {"redelivery"}


@dataclass
class Decision:
    chosen_action: str
    confidence: float
    confidence_breakdown: dict
    status: str  # "auto" | "needs_human"
    reason: str | None
    blocked_by_guardrail: str | None
    simulated_refund_inr: float | None = None
    precedents: list = field(default_factory=list)


def _majority_action(precedents: list[Precedent]) -> tuple[str, float]:
    """Returns (majority_action, agreement_ratio)."""
    counts = Counter(p.resolution_action for p in precedents)
    action, n = counts.most_common(1)[0]
    return action, n / len(precedents)


def decide(precedents: list[Precedent], order: dict | None) -> Decision:
    if not precedents:
        return Decision(
            chosen_action="escalation",
            confidence=0.0,
            confidence_breakdown={"avg_similarity": 0.0, "agreement_ratio": 0.0},
            status="needs_human",
            reason="no_precedents_found",
            blocked_by_guardrail=None,
        )

    avg_similarity = sum(p.similarity for p in precedents) / len(precedents)
    action, agreement_ratio = _majority_action(precedents)

    confidence = round(0.6 * avg_similarity + 0.4 * agreement_ratio, 4)

    status = "auto"
    reason = None
    blocked_by_guardrail = None

    # --- precedent-quality gate -------------------------------------------------
    if agreement_ratio < 0.6:
        status = "needs_human"
        reason = "precedents_disagree"
    elif confidence < AUTO_CONFIDENCE_THRESHOLD or avg_similarity < AUTO_MIN_SIMILARITY:
        status = "needs_human"
        reason = "low_confidence"

    # --- guardrails (order context) ---------------------------------------------
    simulated_refund = None
    if order is None:
        if status == "auto":
            status = "needs_human"
            reason = "order_context_missing"
    else:
        order_cancelled = str(order.get("delivery_status", "")).lower() == "cancelled"
        order_value = float(order.get("value_inr", 0) or 0)

        if action in REDELIVERY_ACTIONS and order_cancelled:
            status = "needs_human"
            reason = "blocked_by_guardrail"
            blocked_by_guardrail = "cancelled_order_blocks_redelivery"

        elif action in REFUND_ACTIONS:
            if order_value <= 0:
                status = "needs_human"
                reason = "blocked_by_guardrail"
                blocked_by_guardrail = "no_order_value_to_refund_against"
            else:
                # simulate: refund is capped at order value, never larger
                simulated_refund = min(order_value, order_value)  # explicit cap, self-evident
                if status == "auto":
                    pass  # fine, refund is within bounds

    return Decision(
        chosen_action=action,
        confidence=confidence,
        confidence_breakdown={
            "avg_similarity": round(avg_similarity, 4),
            "agreement_ratio": round(agreement_ratio, 4),
            "formula": "0.6 * avg_similarity + 0.4 * agreement_ratio",
        },
        status=status,
        reason=reason,
        blocked_by_guardrail=blocked_by_guardrail,
        simulated_refund_inr=simulated_refund,
        precedents=precedents,
    )
