"use client";

import { useEffect, useRef, useState } from "react";

interface QuizTimerProps {
  totalSeconds: number;
  onTimeUp:     () => void;
}

export default function QuizTimer({ totalSeconds, onTimeUp }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Fix: single interval on mount only — no re-creation every tick
  useEffect(() => {
    if (totalSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (totalSeconds <= 0) return null;

  const mins   = Math.floor(remaining / 60);
  const secs   = remaining % 60;
  const pct    = (remaining / totalSeconds) * 100;
  const urgent = remaining < 60;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${
      urgent ? "border-red-700 bg-red-900/20" : "border-gray-700 bg-gray-900"
    }`}>
      <div className={`text-sm font-mono font-bold ${urgent ? "text-red-400" : "text-white"}`}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all ${urgent ? "bg-red-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}