"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import {
  getAssignments,
  submitAssignment,
  getMySubmission,
  Assignment,
  Submission,
} from "@/services/assignmentService";

export default function AssignmentPage() {
  const params       = useParams();
  const courseId     = params.id as string;
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content,    setContent]    = useState("");
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // getMySubmission silently returns null on 404 (no prior submission)
        const [assignments, sub] = await Promise.all([
          getAssignments(courseId),
          getMySubmission(courseId, assignmentId),
        ]);
        const found = assignments.find((a) => a.id === assignmentId) || null;
        setAssignment(found);
        setSubmission(sub);
      } catch (err) {
        console.error("Failed to load assignment:", err);
        setError("Failed to load assignment data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();

    // Client-side guards — never send empty content to the backend
    if (!trimmed) {
      setError("Please write your answer before submitting.");
      return;
    }
    if (trimmed.length > 50000) {
      setError("Submission is too long (max 50,000 characters).");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const sub = await submitAssignment(courseId, assignmentId, trimmed);
      setSubmission(sub);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: string | string[] } };
        request?: unknown;
        message?: string;
      };

      const status = axiosErr?.response?.status;
      const rawDetail = axiosErr?.response?.data?.detail;
      // detail can be a string or an array of validation error strings
      const detail = Array.isArray(rawDetail)
        ? rawDetail.join("; ")
        : rawDetail ?? "";

      if (status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (status === 403) {
        setError(
          detail ||
          "You are not enrolled in this course or your enrollment is pending approval."
        );
      } else if (status === 400) {
        setError(
          detail ||
          "Submission rejected. You may have already submitted this assignment."
        );
      } else if (status === 422) {
        // Pydantic validation error — surface the backend message directly
        setError(detail || "Invalid submission. Please check your answer and try again.");
      } else if (status === 503) {
        setError("The server is temporarily unavailable. Please try again in a moment.");
      } else if (status && status >= 500) {
        setError(
          detail ||
          "A server error occurred. Please try again. If the problem persists, contact support."
        );
      } else if (!axiosErr?.response) {
        // True network failure (no response received at all)
        setError(
          "Could not reach the server. Please check that you are connected to the internet and try again."
        );
      } else {
        setError(detail || "Submission failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isDeadlinePassed = assignment?.deadline
    ? new Date() > new Date(assignment.deadline)
    : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400">Assignment not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Assignment info card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h1 className="text-white font-bold text-2xl mb-2">{assignment.title}</h1>
          {assignment.description && (
            <p className="text-gray-400 text-sm mb-4">{assignment.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-indigo-400 font-bold">{assignment.max_score}</p>
              <p className="text-gray-500 text-xs">Max score</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-amber-400 font-bold">{assignment.passing_score}</p>
              <p className="text-gray-500 text-xs">Pass score</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className={`font-bold text-sm ${isDeadlinePassed ? "text-red-400" : "text-green-400"}`}>
                {assignment.deadline
                  ? new Date(assignment.deadline).toLocaleDateString()
                  : "No deadline"}
              </p>
              <p className="text-gray-500 text-xs">Deadline</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-gray-300 font-bold">{assignment.late_penalty}%</p>
              <p className="text-gray-500 text-xs">Late penalty/day</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-2xl p-6 mb-6">
            <h3 className="text-indigo-300 font-semibold mb-2 text-sm">Instructions</h3>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </p>
          </div>
        )}

        {/* Submission state */}
        {submission ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Your submission</h2>
              <span className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full">
                Submitted
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{submission.content}</p>
            </div>
            {submission.is_late && (
              <p className="text-yellow-400 text-xs mb-2">
                Late submission ({submission.late_days} days late)
              </p>
            )}
            {submission.is_graded ? (
              <p className="text-green-400 text-sm">
                Score: <strong>{submission.score}/{assignment.max_score}</strong>
                {submission.feedback && (
                  <span className="text-gray-400"> · {submission.feedback}</span>
                )}
              </p>
            ) : (
              <p className="text-yellow-400 text-sm">Pending review by mentor</p>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Submit your answer</h2>

            {isDeadlinePassed && !assignment.allow_late && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4">
                <p className="text-red-400 text-sm">
                  Deadline has passed. Late submissions are not allowed.
                </p>
              </div>
            )}
            {isDeadlinePassed && assignment.allow_late && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 mb-4">
                <p className="text-yellow-400 text-sm">
                  Late submission — {assignment.late_penalty}% penalty per day applies.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <textarea
                rows={8}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (error) setError("");
                  if (success) setSuccess(false);
                }}
                placeholder="Write your answer here..."
                disabled={(isDeadlinePassed && !assignment.allow_late) || submitting}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">
                  {content.length.toLocaleString()} characters
                </p>
                {content.length > 50000 && (
                  <p className="text-red-400 text-xs">Too long (max 50,000)</p>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Success message (shown before submission state re-renders) */}
              {success && !error && (
                <div className="bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3">
                  <p className="text-green-400 text-sm">✓ Assignment submitted successfully!</p>
                </div>
              )}

              <Button
                type="submit"
                loading={submitting}
                disabled={
                  (isDeadlinePassed && !assignment.allow_late) ||
                  submitting ||
                  content.trim().length === 0
                }
                fullWidth
              >
                {submitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
