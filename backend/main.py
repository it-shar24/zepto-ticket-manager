"""
main.py
-------
FastAPI app. Two endpoints:
  POST /api/process  -> runs the full pipeline over all new tickets,
                         writes results to data/decisions.json (skips if
                         already processed, unless ?force=true)
  GET  /api/results  -> returns whatever is currently in decisions.json

Run locally:
  uvicorn main:app --reload --port 8000
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from data_loader import store
from matcher import TfidfMatcher
from decision_engine import decide
from reply import draft_reply

DECISIONS_PATH = Path(__file__).parent / "data" / "decisions.json"

matcher: TfidfMatcher | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global matcher
    store.load()
    matcher = TfidfMatcher(store.resolved, top_k=3)
    print(f"[startup] loaded {len(store.resolved)} resolved, "
          f"{len(store.new)} new tickets, {len(store.orders)} orders")
    yield


app = FastAPI(title="Zepto Support Ticket Manager", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon demo: wide open. Tighten if you have time.
    allow_methods=["*"],
    allow_headers=["*"],
)


def _process_one_ticket(row) -> dict:
    ticket_id = row["ticket_id"]
    description = row["description"]
    order_id = row["order_id"]

    order = store.order_lookup(order_id)
    precedents = matcher.top_matches(description)
    decision = decide(precedents, order)

    reply_text = draft_reply(description, decision.chosen_action, precedents, decision.status)

    return {
        "ticket_id": ticket_id,
        "created_at": row.get("created_at"),
        "description": description,
        "order_id": order_id,
        "order": order,
        "status": decision.status,  # "auto" | "needs_human"
        "chosen_action": decision.chosen_action,
        "confidence": decision.confidence,
        "confidence_breakdown": decision.confidence_breakdown,
        "reason": decision.reason,
        "blocked_by_guardrail": decision.blocked_by_guardrail,
        "simulated_refund_inr": decision.simulated_refund_inr,
        "reply": reply_text,
        "precedents": [
            {
                "ticket_id": p.ticket_id,
                "description": p.description,
                "category": p.category,
                "resolution_action": p.resolution_action,
                "resolution_note": p.resolution_note,
                "csat": p.csat,
                "similarity": p.similarity,
            }
            for p in precedents
        ],
        # bonus-ready fields, unused by core UI but here so the approve/override
        # bonus doesn't need a schema migration:
        "human_override": None,
    }


@app.post("/api/process")
def process_tickets(force: bool = Query(False, description="Reprocess even if a log already exists")):
    if DECISIONS_PATH.exists() and not force:
        with open(DECISIONS_PATH) as f:
            existing = json.load(f)
        return {"status": "already_processed", "count": len(existing), "results": existing}

    results = [_process_one_ticket(row) for _, row in store.new.iterrows()]

    DECISIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DECISIONS_PATH, "w") as f:
        json.dump(results, f, indent=2)

    return {"status": "processed", "count": len(results), "results": results}


@app.get("/api/results")
def get_results():
    if not DECISIONS_PATH.exists():
        return {"status": "not_processed", "count": 0, "results": []}
    with open(DECISIONS_PATH) as f:
        results = json.load(f)
    return {"status": "ok", "count": len(results), "results": results}


@app.post("/api/override/{ticket_id}")
def override_ticket(ticket_id: str, action: str, note: str = ""):
    """Bonus: human approve/override control, with logging."""
    if not DECISIONS_PATH.exists():
        return {"error": "no decisions logged yet"}
    with open(DECISIONS_PATH) as f:
        results = json.load(f)

    for r in results:
        if r["ticket_id"] == ticket_id:
            r["human_override"] = {"action": action, "note": note}
            r["status"] = "auto"  # human has now approved/actioned it
            break
    else:
        return {"error": f"ticket {ticket_id} not found"}

    with open(DECISIONS_PATH, "w") as f:
        json.dump(results, f, indent=2)
    return {"status": "ok", "ticket_id": ticket_id}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "resolved_tickets": len(store.resolved) if not store.resolved.empty else 0,
        "new_tickets": len(store.new) if not store.new.empty else 0,
        "orders": len(store.orders) if not store.orders.empty else 0,
    }
