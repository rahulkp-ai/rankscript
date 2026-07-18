"use client";

interface ActivityCalendarProps {
  streakDays: number;
}

export default function ActivityCalendar({ streakDays }: ActivityCalendarProps) {
  const weeks = 10;
  const days  = weeks * 7;

  // Mark the last N days as active based on streak
  const cells = Array.from({ length: days }, (_, i) => {
    const daysAgo = days - 1 - i;
    return daysAgo < streakDays;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold text-sm">Activity</p>
        <p className="text-gray-400 text-xs">{streakDays} day streak 🔥</p>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const idx = w * 7 + d;
              const active = cells[idx];
              return (
                <div key={d}
                  className={`w-3 h-3 rounded-sm transition-colors ${
                    active ? "bg-indigo-500" : "bg-gray-800"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-sm bg-gray-800"/>
        <span className="text-gray-600 text-xs">No activity</span>
        <div className="w-3 h-3 rounded-sm bg-indigo-500 ml-2"/>
        <span className="text-gray-600 text-xs">Active</span>
      </div>
    </div>
  );
}