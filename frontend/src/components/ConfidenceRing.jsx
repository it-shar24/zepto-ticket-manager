import "./ConfidenceRing.css";

/**
 * Animated circular progress ring showing overall confidence.
 * Replaces a flat percentage number with something that reads at a glance
 * across a room — the ring "fills" on mount for a bit of demo polish.
 */
export default function ConfidenceRing({ value = 0, color = "var(--auto)", size = 46 }) {
  const stroke = size * 0.13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          className="ring__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ "--dash-offset": offset, "--dash-full": circumference }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring__label mono" style={{ fontSize: size * 0.26, color }}>
        {Math.round(value * 100)}
      </span>
    </div>
  );
}
