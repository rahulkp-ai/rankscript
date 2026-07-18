interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md" | "lg";
}

export default function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };

  if (rank === 1) return (
    <div className={`${sizes[size]} rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-400`}>
      🥇
    </div>
  );
  if (rank === 2) return (
    <div className={`${sizes[size]} rounded-full bg-gray-400/20 border-2 border-gray-400 flex items-center justify-center font-bold text-gray-300`}>
      🥈
    </div>
  );
  if (rank === 3) return (
    <div className={`${sizes[size]} rounded-full bg-amber-700/20 border-2 border-amber-700 flex items-center justify-center font-bold text-amber-600`}>
      🥉
    </div>
  );

  return (
    <div className={`${sizes[size]} rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-400`}>
      {rank}
    </div>
  );
}