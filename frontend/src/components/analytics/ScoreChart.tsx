interface ScoreChartProps {
  data:   { label: string; value: number; max?: number; color?: string }[];
  title?: string;
}

export default function ScoreChart({ data, title }: ScoreChartProps) {
  const maxVal = Math.max(...data.map((d) => d.max || d.value || 100), 100);

  return (
    <div className="w-full">
      {title && <p className="text-white font-semibold text-sm mb-4">{title}</p>}
      <div className="flex flex-col gap-3">
        {data.map((item, i) => {
          const pct = Math.min((item.value / (item.max || maxVal)) * 100, 100);
          const color = item.color || "#6366f1";
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-400 text-xs">{item.label}</span>
                <span className="text-gray-300 text-xs font-medium">{item.value.toFixed(1)}</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}