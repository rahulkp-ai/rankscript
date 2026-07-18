import { AttemptResult } from "@/services/quizService";
import Link from "next/link";

interface QuizResultProps {
  result:     AttemptResult;
  passScore:  number;
  courseId:   string;
  onRetry?:   () => void;
  canRetry:   boolean;
}

export default function QuizResult({
  result, passScore, courseId, onRetry, canRetry,
}: QuizResultProps) {
  const passed = result.passed;

  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">{passed ? "🎉" : "😔"}</div>

      <h2 className={`text-2xl font-bold mb-2 ${passed ? "text-green-400" : "text-red-400"}`}>
        {passed ? "You passed!" : "Not quite there"}
      </h2>

      <p className="text-gray-400 text-sm mb-8">
        {passed
          ? "Great work! Your score has been recorded."
          : `You need ${passScore}% to pass. Keep practicing!`}
      </p>

      {/* Score card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm mx-auto mb-8">
        <div className="text-5xl font-bold text-white mb-1">
          {Math.round(result.score)}%
        </div>
        <p className="text-gray-500 text-sm mb-6">Your score</p>

        <div className="w-full h-3 bg-gray-800 rounded-full mb-6">
          <div
            className={`h-3 rounded-full transition-all ${passed ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${result.score}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">Correct</p>
            <p className="text-white font-bold">{result.earned_points}/{result.total_points}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">Time taken</p>
            <p className="text-white font-bold">
              {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        {canRetry && !passed && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Try again
          </button>
        )}
        <Link
          href={`/courses/${courseId}`}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Back to course
        </Link>
      </div>
    </div>
  );
}