"use client";

import { Question } from "@/services/quizService";

interface QuizQuestionProps {
  question:      Question;
  index:         number;
  total:         number;
  selected:      string | null;
  onSelect:      (option: string) => void;
  showResult?:   boolean;
  correctOption?: string;
}

const OPTIONS = ["a", "b", "c", "d"] as const;

const optionLabels: Record<string, string> = {
  a: "A", b: "B", c: "C", d: "D",
};

export default function QuizQuestion({
  question, index, total, selected, onSelect, showResult, correctOption,
}: QuizQuestionProps) {
  const getOptionStyle = (opt: string) => {
    const base = "w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer text-sm";
    if (!showResult) {
      return selected === opt
        ? `${base} border-indigo-500 bg-indigo-900/30 text-white`
        : `${base} border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600`;
    }
    if (opt === correctOption) return `${base} border-green-500 bg-green-900/20 text-green-400`;
    if (opt === selected && opt !== correctOption) return `${base} border-red-500 bg-red-900/20 text-red-400`;
    return `${base} border-gray-800 bg-gray-900/50 text-gray-500`;
  };

  const getOptionText = (opt: string): string | null => {
    if (opt === "a") return question.option_a;
    if (opt === "b") return question.option_b;
    if (opt === "c") return question.option_c ?? null;
    if (opt === "d") return question.option_d ?? null;
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">Question {index + 1} of {total}</span>
        <span className="text-xs text-indigo-400">{question.points} pt{question.points > 1 ? "s" : ""}</span>
      </div>

      <h3 className="text-white font-medium text-base mb-6 leading-relaxed">
        {question.text}
      </h3>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const text = getOptionText(opt);
          if (!text) return null;
          return (
            <button
              key={opt}
              onClick={() => !showResult && onSelect(opt)}
              className={getOptionStyle(opt)}
              disabled={showResult}
            >
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selected === opt ? "border-indigo-400 text-indigo-400" : "border-gray-600 text-gray-500"
              }`}>
                {optionLabels[opt]}
              </span>
              <span>{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}