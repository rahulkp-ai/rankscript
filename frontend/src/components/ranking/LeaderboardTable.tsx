import { LeaderboardEntry } from "@/services/rankingService";
import RankBadge from "./RankBadge";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  myRank?: number | null;
}

export default function LeaderboardTable({ entries, myRank }: LeaderboardTableProps) {
  if (entries.length === 0) return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🏆</p>
      <p className="text-gray-400">No rankings yet — complete courses and quizzes to appear here!</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <div key={entry.user_id}
          className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
            entry.is_me
              ? "bg-indigo-900/20 border-indigo-700"
              : "bg-gray-900 border-gray-800"
          }`}>

          <RankBadge rank={entry.rank} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`font-medium text-sm ${entry.is_me ? "text-indigo-300" : "text-white"}`}>
                {entry.name}
                {entry.is_me && <span className="ml-2 text-xs text-indigo-400">(you)</span>}
              </p>
            </div>
            {(entry.state || entry.district) && (
              <p className="text-gray-500 text-xs mt-0.5">
                {[entry.district, entry.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-sm">{entry.rank_score.toFixed(1)}</p>
            <p className="text-gray-500 text-xs">{entry.xp.toFixed(0)} XP</p>
          </div>
        </div>
      ))}

      {/* Fix: explicit null check instead of falsy coercion */}
      {myRank != null && myRank > entries.length && (
        <div className="text-center py-3 text-gray-500 text-sm border-t border-gray-800 mt-2">
          Your global rank: <span className="text-indigo-400 font-bold">#{myRank}</span>
        </div>
      )}
    </div>
  );
}