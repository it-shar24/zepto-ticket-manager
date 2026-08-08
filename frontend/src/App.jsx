import { useEffect, useState } from "react";
import Header from "./components/Header";
import Column from "./components/Column";
import TicketModal from "./components/TicketModal";
import { getResults, processTickets, overrideTicket } from "./api";
import "./App.css";

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | empty | ready | error
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  async function loadResults() {
    try {
      const data = await getResults();
      if (data.count === 0) {
        setStatus("empty");
      } else {
        setTickets(data.results);
        setStatus("ready");
      }
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  async function handleProcess() {
    setProcessing(true);
    setError(null);
    try {
      const data = await processTickets(status === "ready"); // force reprocess only if already have results
      setTickets(data.results);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleOverride(ticketId, action, note) {
    await overrideTicket(ticketId, action, note);
    const data = await getResults();
    setTickets(data.results);
    setSelected(data.results.find((t) => t.ticket_id === ticketId) || null);
  }

  const autoTickets = tickets.filter((t) => t.status === "auto");
  const humanTickets = tickets.filter((t) => t.status !== "auto");

  return (
    <div className="app">
      <Header
        onProcess={handleProcess}
        processing={processing}
        hasResults={status === "ready"}
        counts={{ auto: autoTickets.length, human: humanTickets.length }}
      />

      <main className="app__main">
        {status === "loading" && <p className="app__hint">Loading…</p>}

        {status === "error" && (
          <p className="app__hint app__hint--error">
            Couldn't reach the backend{error ? `: ${error}` : ""}. Is it running on the
            configured VITE_API_BASE?
          </p>
        )}

        {status === "empty" && (
          <div className="app__empty">
            <div className="app__empty-icon">🎫</div>
            <p className="app__empty-title">No tickets processed yet</p>
            <p className="app__hint">
              Click <strong>Process Tickets</strong> to match every new ticket against
              resolved history and populate the board.
            </p>
          </div>
        )}

        {status === "ready" && (
          <div className="app__board">
            <Column
              title="Auto-Resolved"
              tint="auto"
              tickets={autoTickets}
              onSelect={setSelected}
              emptyLabel="Nothing auto-resolved yet."
            />
            <Column
              title="Needs Human"
              tint="human"
              tickets={humanTickets}
              onSelect={setSelected}
              emptyLabel="Nothing waiting on a human."
            />
          </div>
        )}
      </main>

      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onOverride={handleOverride}
        />
      )}
    </div>
  );
}
