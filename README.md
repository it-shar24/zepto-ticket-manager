# Zepto Support Ticket Manager

Q4 · DigiPlus IT Agentic AI Hackathon

Matches every incoming ticket against 300 resolved tickets, auto-resolves the
routine ones the way history resolved them, and queues the rest for a human
with precedents attached.

## What's built

- **Backend (FastAPI)** — TF-IDF similarity matcher over resolved-ticket
  history, a confidence + guardrail decision engine (auto vs needs-human),
  Gemini-drafted replies (with an offline fallback), and a JSON decision log.
- **Frontend (React + Vite)** — a two-lane board (Auto-Resolved / Needs
  Human), each card showing action + confidence, click-through detail modal
  with the top-3 precedents, confidence breakdown, drafted reply, and a
  human approve/override control (bonus).

Validated against the sample data: `milk packet missing` on a cancelled
order correctly matches its historical precedent at ~100% similarity, but
the cancelled-order guardrail blocks the redelivery and routes it to the
human lane instead of auto-acting — exactly the brief's validation scenario.

## Project structure

```
zepto-ticket-manager/
├── backend/
│   ├── main.py              # FastAPI app, endpoints
│   ├── data_loader.py       # loads the 3 CSVs into memory
│   ├── matcher.py           # TF-IDF + cosine similarity
│   ├── decision_engine.py   # confidence scoring + guardrails
│   ├── reply.py             # Gemini reply drafting + fallback
│   ├── requirements.txt
│   ├── .env.example
│   └── data/
│       ├── resolved_tickets.csv
│       ├── new_tickets.csv
│       ├── orders_context.csv
│       └── decisions.json   # generated at runtime, gitignored
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── Header.jsx / .css
    │       ├── Column.jsx / .css
    │       ├── TicketCard.jsx / .css
    │       ├── TicketModal.jsx / .css
    │       └── MatchBar.jsx / .css
    ├── .env.example
    └── package.json
```

## Running locally

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # optionally add GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local   # points VITE_API_BASE at the backend
npm run dev
```

Open the printed Vite URL, click **Process Tickets**.

## API

| Endpoint | Method | What it does |
|---|---|---|
| `/api/process?force=` | POST | Runs the pipeline over all new tickets. Skips reprocessing (returns saved log) unless `force=true`. |
| `/api/results` | GET | Returns whatever's currently in the decision log. |
| `/api/override/{ticket_id}` | POST | Bonus: human approves/overrides a queued ticket, logs it. |
| `/api/health` | GET | Row counts, sanity check. |

## Deployment (for the "live public URL" requirement)

- **Backend**: Render / Railway / Fly.io free tier. Set `GEMINI_API_KEY` as
  an env var there if you're using it — don't commit it.
- **Frontend**: Vercel / Netlify free tier. Set `VITE_API_BASE` to the
  deployed backend URL in the platform's env var settings, not in a
  committed `.env`.

---

## Working as a 2-person team (Windows + macOS, both VS Code)

The judges want to see frequent commits from both machines. Here's a split
that lets you both work in parallel without stepping on each other's files
for most of the build, plus a git routine that keeps history honest.

### Suggested work split

This app has a natural seam: **backend logic** vs **frontend display** — use it.

**Person A — Backend / data / decision logic**
- `data_loader.py`, `matcher.py`, `decision_engine.py`, `reply.py`, `main.py`
- Tuning the confidence thresholds and guardrails against the sample data
- Deploying the backend

**Person B — Frontend / UI**
- Everything in `frontend/src/`
- Can start immediately against the **mock shape** of `/api/results`
  (copy the sample JSON output further down this README into a local fixture,
  or point `VITE_API_BASE` at nothing and hardcode a fixture array in `App.jsx`
  temporarily) — don't wait on Person A's backend to be "done" to start building UI
- Deploying the frontend

The contract between you is just the JSON shape of one ticket result (see
`main.py`'s `_process_one_ticket`, or a sample object below). Agree on that
shape in the first 15 minutes, then work independently.

```json
{
  "ticket_id": "N-002",
  "description": "milk packet missing from my order",
  "order_id": "ORD-9902",
  "order": {"items": 5, "value_inr": 999, "delivery_status": "cancelled"},
  "status": "needs_human",
  "chosen_action": "redelivery",
  "confidence": 0.8667,
  "confidence_breakdown": {"avg_similarity": 1.0, "agreement_ratio": 0.6667},
  "reason": "blocked_by_guardrail",
  "blocked_by_guardrail": "cancelled_order_blocks_redelivery",
  "reply": "...",
  "precedents": [{"ticket_id": "H-1000", "description": "...", "resolution_action": "redelivery", "csat": 5.0, "similarity": 1.0}]
}
```

### Git workflow for two machines, frequent commits

1. **One of you creates the GitHub repo first** (Person A, say), pushes this
   initial scaffold, and adds Person B as a collaborator.
2. **Both clone it** onto your own machines:
   ```bash
   git clone https://github.com/<org>/zepto-ticket-manager.git
   ```
3. **Branch per person, not per feature** — for a 6-hour hackathon this is
   simpler than fine-grained feature branches:
   ```bash
   git checkout -b backend-a     # Person A
   git checkout -b frontend-b    # Person B
   ```
4. **Commit small and often** — every working increment, not just at the
   end of a task. This is literally what the judges are checking for.
   ```bash
   git add backend/matcher.py
   git commit -m "matcher: TF-IDF top-3 similarity working on sample data"
   git push origin backend-a
   ```
5. **Merge to `main` at natural checkpoints** (roughly hourly), not
   continuously — open a PR or just merge locally if you're both watching:
   ```bash
   git checkout main
   git pull
   git merge backend-a
   git push
   ```
   Then the other person rebases their branch on the fresh `main`:
   ```bash
   git checkout frontend-b
   git merge main
   ```
6. **Because the split is backend/ vs frontend/ folders, merge conflicts
   should be rare** — you're touching different files almost the whole
   time. The one shared surface is the JSON contract above; if it changes,
   say so out loud before pushing.
7. **Windows/Mac gotchas to avoid wasted commits:**
   - Add the `.gitignore` in this repo *before* either of you runs
     `npm install` or `pip install` — `node_modules/` and `.venv/` should
     never be committed (they're already excluded here).
   - Line endings: this repo doesn't set `core.autocrlf`; if you see every
     line of a file showing as changed after a Windows checkout, run
     `git config --global core.autocrlf true` on the Windows machine once.
   - Don't commit `.env` / `.env.local` — only the `.env.example` files are
     tracked. Each of you keeps your own local `GEMINI_API_KEY` / API base
     out of git.
8. **Last 30–45 minutes**: freeze feature work, both pull `main`, do one
   joint smoke test (`Process Tickets` end-to-end against the deployed
   URLs), fix only what's broken, final commit, final push.

### Suggested commit cadence (6-hour build)

| Time | Person A (backend) | Person B (frontend) |
|---|---|---|
| 0:00–0:15 | Agree on JSON contract, scaffold repo | — |
| 0:15–1:30 | `data_loader` + `matcher` working, commit | Static board layout with fixture data, commit |
| 1:30–2:30 | `decision_engine` + guardrails, commit | Ticket card + column components, commit |
| 2:30–3:00 | **Merge to main** | **Merge to main, switch fixture → real API** |
| 3:00–4:00 | `reply.py` + `main.py` endpoints, commit | Detail modal, commit |
| 4:00–4:30 | **Merge to main** | **Merge to main** |
| 4:30–5:15 | Deploy backend, commit deploy config | Deploy frontend, wire to deployed backend URL |
| 5:15–6:00 | Bonus: override endpoint, commit | Bonus: override UI, commit. Joint smoke test. |
