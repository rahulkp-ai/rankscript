interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({
  progress,
  showLabel = true,
  size = "md",
}: ProgressBarProps) {
  const height = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Progress</span>
          <span className="text-indigo-400 font-medium">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-gray-800 rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-500 ${
            progress >= 100
              ? "bg-green-500"
              : progress > 50
              ? "bg-indigo-500"
              : "bg-indigo-600"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}