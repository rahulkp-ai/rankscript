interface StatCardProps {
  label:     string;
  value:     string | number;
  sub?:      string;
  color?:    "indigo" | "green" | "amber" | "purple" | "red" | "blue";
  icon?:     string;
}

const colorMap: Record<string, string> = {
  indigo: "text-indigo-400",
  green:  "text-green-400",
  amber:  "text-amber-400",
  purple: "text-purple-400",
  red:    "text-red-400",
  blue:   "text-blue-400",
};

export default function StatCard({ label, value, sub, color = "indigo", icon }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {icon && <div className="text-2xl mb-3">{icon}</div>}
      <p className={`text-2xl font-bold ${colorMap[color]} mb-1`}>{value}</p>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}