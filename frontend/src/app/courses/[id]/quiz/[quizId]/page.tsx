"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import QuizQuestion from "@/components/quiz/QuizQuestion";
import QuizTimer from "@/components/quiz/QuizTimer";
import QuizResult from "@/components/quiz/QuizResult";
import ErrorBoundary from "@/components/ErrorBoundary";
import Button from "@/components/common/Button";
import {
  getQuizzes, getQuestions, submitQuiz, getMyAttempts,
  Quiz, Question, AttemptResult,
} from "@/services/quizService";

export default function TakeQuizPage() {
  const params   = useParams();
  const courseId = params.id as string;
  const quizId   = params.quizId as string;

  const [quiz,         setQuiz]         = useState<Quiz | null>(null);
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [answers,      setAnswers]      = useState<Record<string, string>>({});
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [result,       setResult]       = useState<AttemptResult | null>(null);
  const [pastAttempts, setPastAttempts] = useState<AttemptResult[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const [quizList, qs, attempts] = await Promise.all([
          getQuizzes(courseId),
          getQuestions(courseId, quizId),
          getMyAttempts(courseId, quizId),
        ]);
        setQuiz(quizList.find((q) => q.id === quizId) || null);
        setQuestions(qs);
        setPastAttempts(attempts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, quizId]);

  const handleAnswer = (option: string) => {
    const current = questions[currentIdx];
    if (answers[current.id] === option) {
      const updated = { ...answers };
      delete updated[current.id];
      setAnswers(updated);
    } else {
      setAnswers({ ...answers, [current.id]: option });
    }
  };

  const handleSkip = () => {
    const updated = { ...answers };
    delete updated[questions[currentIdx].id];
    setAnswers(updated);
    if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const handleSubmit = async (force = false) => {
    // Fix: warn about unanswered questions instead of blocking submit
    const unanswered = questions.length - Object.keys(answers).length;
    if (!force && unanswered > 0) {
      const ok = window.confirm(
        `You have ${unanswered} unanswered question${unanswered !== 1 ? "s" : ""}. Submit anyway?`
      );
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
      const res = await submitQuiz(courseId, quizId, answers, timeTaken);
      setResult(res);
      setPastAttempts((prev) => [res, ...prev]);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    startTime.current = Date.now();
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400 animate-pulse">Loading quiz...</p>
      </div>
    </div>
  );

  if (!quiz || questions.length === 0) return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Quiz not found or has no questions yet.</p>
      </div>
    </div>
  );

  const attemptsUsed  = pastAttempts.length;
  const attemptsLeft  = quiz.max_attempts > 0 ? quiz.max_attempts - attemptsUsed : null;
  const noAttemptsLeft = attemptsLeft !== null && attemptsLeft <= 0;

  if (noAttemptsLeft && !result) return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-4">🚫</p>
          <h2 className="text-white font-bold text-xl mb-2">No attempts remaining</h2>
          <p className="text-gray-400 text-sm mb-6">
            You have used all {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? "s" : ""} for this quiz.
          </p>
          {pastAttempts.length > 0 && (
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-gray-400 text-sm font-medium">Your attempts:</p>
              {pastAttempts.map((a, i) => (
                <div key={a.id} className="flex justify-between items-center bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-400 text-sm">Attempt {pastAttempts.length - i}</span>
                  <span className={`font-bold text-sm ${a.passed ? "text-green-400" : "text-red-400"}`}>
                    {Math.round(a.score)}% — {a.passed ? "Passed" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <a href={`/courses/${courseId}`}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors inline-block">
            Back to course
          </a>
        </div>
      </div>
    </div>
  );

  if (result) return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <QuizResult
          result={result}
          passScore={quiz.pass_score}
          courseId={courseId}
          canRetry={attemptsLeft === null || attemptsLeft > 0}
          onRetry={handleRetry}
        />
        {pastAttempts.length > 1 && (
          <div className="mt-8">
            <h3 className="text-white font-semibold mb-3 text-sm">All attempts</h3>
            <div className="flex flex-col gap-2">
              {pastAttempts.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-400 text-sm">Attempt {pastAttempts.length - i}</span>
                  <span className={`text-sm font-bold ${a.passed ? "text-green-400" : "text-red-400"}`}>
                    {Math.round(a.score)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const current  = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white font-bold text-xl">{quiz.title}</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {answered}/{questions.length} answered
                {attemptsLeft !== null && ` · ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left`}
              </p>
            </div>
            {quiz.time_limit > 0 && (
              <QuizTimer
                totalSeconds={quiz.time_limit * 60}
                onTimeUp={() => handleSubmit(true)}
              />
            )}
          </div>

          <div className="w-full h-1.5 bg-gray-800 rounded-full mb-8">
            <div
              className="h-1.5 bg-indigo-500 rounded-full transition-all"
              style={{ width: `${(answered / questions.length) * 100}%` }}
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
            <QuizQuestion
              question={current}
              index={currentIdx}
              total={questions.length}
              selected={answers[current.id] || null}
              onSelect={handleAnswer}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip question →
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setCurrentIdx(currentIdx - 1)}
              disabled={currentIdx === 0}
            >
              ← Previous
            </Button>

            <div className="flex gap-2">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    i === currentIdx
                      ? "bg-indigo-600 text-white"
                      : answers[questions[i].id]
                      ? "bg-green-900/50 text-green-400 border border-green-700"
                      : "bg-gray-800 text-gray-500"
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>

            {currentIdx < questions.length - 1 ? (
              <Button onClick={() => setCurrentIdx(currentIdx + 1)}>Next →</Button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                {/* Fix: warn instead of blocking */}
                {unanswered > 0 && (
                  <p className="text-xs text-yellow-500">
                    {unanswered} question{unanswered !== 1 ? "s" : ""} unanswered
                  </p>
                )}
                <Button
                  onClick={() => handleSubmit(false)}
                  loading={submitting}
                  disabled={submitting}
                >
                  Submit Quiz
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}