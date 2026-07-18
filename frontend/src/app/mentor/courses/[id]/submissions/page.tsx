"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import { getAssignments, getAllSubmissions, gradeSubmission, Assignment, Submission } from "@/services/assignmentService";

interface SubmissionWithAssignment {
  submission: Submission;
  assignment: Assignment;
}

export default function SubmissionsPage() {
  const params   = useParams();
  const courseId = params.id as string;

  const [items,      setItems]      = useState<SubmissionWithAssignment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [grading,    setGrading]    = useState<string | null>(null);
  const [scores,     setScores]     = useState<Record<string, number>>({});
  const [feedback,   setFeedback]   = useState<Record<string, string>>({});
  const [success,    setSuccess]    = useState<Record<string, boolean>>({});
  // FIX: replace alert() with inline per-card error state — alert() crashes SSR and is bad UX
  const [gradeError, setGradeError] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const assignments = await getAssignments(courseId);
        const allSubs = await Promise.all(
          assignments.map(async (assignment) => {
            const subs = await getAllSubmissions(courseId, assignment.id);
            return subs.map((sub) => ({ submission: sub, assignment }));
          })
        );
        setItems(allSubs.flat());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const handleGrade = async (sub: Submission, assignment: Assignment) => {
    const score = scores[sub.id];
    if (score === undefined || score < 0 || score > assignment.max_score) {
      setGradeError({ ...gradeError, [sub.id]: `Score must be between 0 and ${assignment.max_score}` });
      return;
    }
    setGrading(sub.id);
    // Clear any previous error for this card
    setGradeError((prev) => { const next = { ...prev }; delete next[sub.id]; return next; });
    try {
      await gradeSubmission(courseId, assignment.id, sub.id, score, feedback[sub.id] || "");
      setSuccess({ ...success, [sub.id]: true });
      setItems((prev) => prev.map((item) =>
        item.submission.id === sub.id
          ? { ...item, submission: { ...item.submission, is_graded: true, score, feedback: feedback[sub.id] } }
          : item
      ));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setGradeError({ ...gradeError, [sub.id]: detail || "Grading failed. Please try again." });
    } finally {
      setGrading(null);
    }
  };

  const pending  = items.filter((i) => !i.submission.is_graded);
  const graded   = items.filter((i) => i.submission.is_graded);

  return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Student Submissions</h1>
          <p className="text-gray-400 mt-1">
            {pending.length} pending · {graded.length} graded
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 animate-pulse">Loading submissions...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400">No submissions yet</p>
          </div>
        ) : (
          <>
            {/* Pending submissions */}
            {pending.length > 0 && (
              <div className="mb-8">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  Pending Review ({pending.length})
                </h2>
                <div className="flex flex-col gap-4">
                  {pending.map(({ submission: sub, assignment }) => (
                    <div key={sub.id} className="bg-gray-900 border border-yellow-800/30 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-white font-medium">{assignment.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            Submitted: {new Date(sub.submitted_at).toLocaleString()}
                            {sub.is_late && <span className="text-red-400 ml-2">· Late ({Math.ceil(sub.late_days)} days)</span>}
                          </p>
                        </div>
                        <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2.5 py-1 rounded-full">Pending</span>
                      </div>

                      {/* Student answer */}
                      <div className="bg-gray-800 rounded-xl p-4 mb-4">
                        <p className="text-xs text-gray-500 mb-2">Student answer:</p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{sub.content}</p>
                      </div>

                      {/* Grading form */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Score (max {assignment.max_score})</label>
                            <input type="number" min="0" max={assignment.max_score}
                              value={scores[sub.id] ?? ""}
                              onChange={(e) => {
                                setScores({ ...scores, [sub.id]: Number(e.target.value) });
                                if (gradeError[sub.id]) setGradeError((prev) => { const next = { ...prev }; delete next[sub.id]; return next; });
                              }}
                              className="w-24 px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-xs text-gray-400">Feedback (optional)</label>
                            <input type="text"
                              value={feedback[sub.id] ?? ""}
                              onChange={(e) => setFeedback({ ...feedback, [sub.id]: e.target.value })}
                              placeholder="e.g. Great work! Clean code."
                              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                        </div>

                        {/* FIX: inline error instead of alert() */}
                        {gradeError[sub.id] && (
                          <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-2">
                            <p className="text-red-400 text-sm">{gradeError[sub.id]}</p>
                          </div>
                        )}

                        {success[sub.id] && (
                          <div className="bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-2">
                            <p className="text-green-400 text-sm">✓ Grade submitted successfully</p>
                          </div>
                        )}

                        <Button
                          onClick={() => handleGrade(sub, assignment)}
                          loading={grading === sub.id}>
                          Submit Grade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graded submissions */}
            {graded.length > 0 && (
              <div>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Graded ({graded.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {graded.map(({ submission: sub, assignment }) => (
                    <div key={sub.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{assignment.title}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            Graded: {sub.graded_at ? new Date(sub.graded_at).toLocaleDateString() : "—"}
                          </p>
                          {sub.feedback && (
                            <p className="text-gray-400 text-xs mt-1">&ldquo;{sub.feedback}&rdquo;</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${(sub.score || 0) >= assignment.passing_score ? "text-green-400" : "text-red-400"}`}>
                            {sub.score}/{assignment.max_score}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {(sub.score || 0) >= assignment.passing_score ? "Passed" : "Failed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
