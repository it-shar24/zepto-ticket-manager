const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function getResults() {
  return request("/api/results");
}

export function processTickets(force = false) {
  return request(`/api/process${force ? "?force=true" : ""}`, { method: "POST" });
}

export function overrideTicket(ticketId, action, note) {
  const params = new URLSearchParams({ action, note: note || "" });
  return request(`/api/override/${ticketId}?${params.toString()}`, { method: "POST" });
}
