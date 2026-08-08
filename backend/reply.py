"""
reply.py
--------
Drafts the customer-facing reply for a ticket.

Primary path: one call to Gemini (gemini-1.5-flash) per ticket, given the
ticket description, chosen action, and the top-3 precedents as grounding
for "why this action" explainability.

Fallback path: if GEMINI_API_KEY is not set (e.g. teammate hasn't wired up
billing yet, or we're offline during the demo), a deterministic template
reply is generated instead so the app still fully works end-to-end.
"""

import os
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)

ACTION_COPY = {
    "full_refund": "we've issued a full refund to your original payment method",
    "partial_refund": "we've issued a partial refund to your original payment method",
    "refund_reissue": "we've refunded you and flagged this for a reissue",
    "redelivery": "we're sending the correct/missing item to you again, free of charge",
    "coupon": "we've added a coupon to your account as an apology",
    "apology_no_action": "we've noted this for our records",
    "escalation": "we've escalated this to our support team for a closer look",
}


def _template_reply(description: str, action: str, precedents, status: str) -> str:
    action_phrase = ACTION_COPY.get(action, "we're looking into this for you")
    if status == "auto":
        body = (
            f"Hi! Thanks for letting us know — \"{description.strip()}\". "
            f"We've checked similar past orders and {action_phrase}. "
            f"Sorry for the trouble, and thanks for your patience."
        )
    else:
        body = (
            f"Hi! Thanks for letting us know — \"{description.strip()}\". "
            f"This one needs a quick human check before we act, but a support "
            f"specialist will follow up shortly with the right resolution."
        )
    return body


def draft_reply(description: str, action: str, precedents, status: str) -> str:
    """Returns the drafted reply text. Never raises — falls back to template."""
    if not GEMINI_API_KEY:
        return _template_reply(description, action, precedents, status)

    precedent_lines = "\n".join(
        f"- \"{p.description}\" -> {p.resolution_action} (csat {p.csat})"
        for p in precedents
    )
    prompt = f"""You are a customer support agent for a 10-minute grocery delivery app.
Write a short, warm, 2-3 sentence reply to this customer ticket.

Ticket: "{description}"
Decision status: {status}
Chosen action: {action}

Similar past resolved tickets used as precedent:
{precedent_lines}

If status is "auto", tell the customer the action being taken ({action}) confidently.
If status is "needs_human", tell them a specialist will review shortly, without
promising a specific outcome. Do not mention "TF-IDF", "confidence score", or
internal system details. Keep it under 60 words."""

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text.strip()
    except Exception:
        # network hiccup / bad key / rate limit during a live demo -> never break the flow
        return _template_reply(description, action, precedents, status)
