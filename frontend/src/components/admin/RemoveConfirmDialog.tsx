"use client";

import { useEffect, useState, useRef } from "react";
import Button from "@/components/common/Button";
import { MentorOption } from "@/services/adminService";

interface RemoveConfirmDialogProps {
  open: boolean;
  type: "student" | "mentor";
  userName: string;
  userId: string;
  mentors?: MentorOption[];
  loading?: boolean;
  onConfirm: (data: {
    confirmationName: string;
    adminPassword: string;
    reassignTo?: string | null;
  }) => void;
  onCancel: () => void;
}

export default function RemoveConfirmDialog({
  open,
  type,
  userName,
  userId,
  mentors = [],
  loading = false,
  onConfirm,
  onCancel,
}: RemoveConfirmDialogProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [reassignTo, setReassignTo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setConfirmationName("");
      setAdminPassword("");
      setReassignTo(null);
      setShowPassword(false);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isNameMatch = confirmationName.trim().toLowerCase() === userName.toLowerCase();
  const canSubmit = isNameMatch && adminPassword.length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      confirmationName,
      adminPassword,
      reassignTo: type === "mentor" ? reassignTo : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-red-800/50 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          {/* Warning icon */}
          <div className="w-14 h-14 rounded-full bg-red-900/40 flex items-center justify-center mb-4 mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Remove {type === "student" ? "Student" : "Mentor"}
          </h2>

          {/* Warning message */}
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-300 text-sm text-center mb-2">
              You are about to permanently delete <strong className="text-red-200">{userName}</strong>.
            </p>
            <p className="text-red-400/80 text-xs text-center">
              This action will permanently delete all associated data including profile information,
              {type === "student"
                ? " scores, activity logs, uploaded files, messages, enrollments, quiz attempts, submissions, and all linked records."
                : " assigned students' mentor references, session history, feedback records, uploaded resources, messages, courses, quizzes, assignments, and all linked records."}
            </p>
          </div>

          {/* Mentor reassignment */}
          {type === "mentor" && mentors.length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-300 block mb-1.5">
                Reassign students to another mentor
              </label>
              <select
                value={reassignTo || ""}
                onChange={(e) => setReassignTo(e.target.value || null)}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Leave unassigned</option>
                {mentors
                  .filter((m) => m.id !== userId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Courses and enrollments will be transferred to the selected mentor.
              </p>
            </div>
          )}

          {/* Name confirmation */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-300 block mb-1.5">
              Type <span className="text-red-400 font-bold">{userName}</span> to confirm
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={confirmationName}
              onChange={(e) => setConfirmationName(e.target.value)}
              placeholder={userName}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-800 border text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 border-gray-600"
            />
            {confirmationName.length > 0 && !isNameMatch && (
              <p className="text-xs text-red-400 mt-1">Name does not match</p>
            )}
          </div>

          {/* Admin password */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-300 block mb-1.5">
              Enter your admin password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                disabled={loading}
                className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm bg-gray-800 border text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 border-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirm}
              loading={loading}
              disabled={!canSubmit || loading}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Permanently Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
