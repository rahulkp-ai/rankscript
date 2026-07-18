interface ProgressRingProps {
  value:    number;
  max?:     number;
  size?:    number;
  stroke?:  number;
  color?:   string;
  label?:   string;
  sublabel?: string;
}

export default function ProgressRing({
  value, max = 100, size = 100, stroke = 8,
  color = "#6366f1", label, sublabel,
}: ProgressRingProps) {
  const radius      = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct         = Math.min(value / max, 1);
  const offset      = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke="#1f2937" strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}/>
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span className="text-white font-bold text-sm">{Math.round(value)}{max === 100 ? "%" : ""}</span>
          {sublabel && <span className="text-gray-500 text-xs">{sublabel}</span>}
        </div>
      </div>
      {label && <p className="text-gray-400 text-xs text-center">{label}</p>}
    </div>
  );
}