import "./MatchBar.css";

/**
 * Signature visual element: renders the top-3 precedent similarity scores
 * as a row of signal ticks, like a match-strength meter. Taller + brighter
 * tick = stronger textual match to that precedent. This is the same
 * number the decision engine used to compute confidence, made legible.
 */
export default function MatchBar({ precedents = [], size = "sm" }) {
  return (
    <div className={`matchbar matchbar--${size}`}>
      {precedents.map((p, i) => (
        <div
          className="matchbar__tick"
          key={p.ticket_id || i}
          style={{ "--strength": p.similarity }}
          title={`${p.ticket_id}: ${Math.round(p.similarity * 100)}% match`}
        >
          <span className="matchbar__fill" />
        </div>
      ))}
    </div>
  );
}
