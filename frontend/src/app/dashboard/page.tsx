"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth/login"); return; }
    if (user.role === "admin")  { router.replace("/admin/dashboard");  return; }
    if (user.role === "mentor") { router.replace("/mentor/dashboard"); return; }
    router.replace("/student/dashboard");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-400 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
