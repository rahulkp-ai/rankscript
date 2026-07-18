"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const path = usePathname();

  const studentLinks = [
    { href: "/courses",            label: "Courses" },
    { href: "/leaderboard",        label: "🏆 Leaderboard" },
    { href: "/student/dashboard",  label: "Dashboard" },
  ];

  const mentorLinks = [
    { href: "/mentor/dashboard",      label: "Dashboard" },
    { href: "/mentor/courses/create", label: "+ New Course" },
    { href: "/courses",               label: "Browse" },
  ];

  const adminLinks = [
    { href: "/admin/dashboard",    label: "Dashboard" },
    { href: "/admin/leaderboard",  label: "🏆 Leaderboard" },
    { href: "/admin/approvals",    label: "Approvals" },
  ];

  const links =
    user?.role === "mentor" ? mentorLinks :
    user?.role === "admin"  ? adminLinks  :
    studentLinks;

  const dashboardHref =
    user?.role === "mentor" ? "/mentor/dashboard" :
    user?.role === "admin"  ? "/admin/dashboard"  :
    "/student/dashboard";

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800/50">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">

        <Link href={isAuthenticated ? dashboardHref : "/"} className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-white font-bold text-base tracking-tight">RankScript</span>
        </Link>

        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  path === l.href
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-gray-500">{user?.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  user?.role === "admin"  ? "bg-red-900/50 text-red-400"    :
                  user?.role === "mentor" ? "bg-purple-900/50 text-purple-400" :
                  "bg-indigo-900/50 text-indigo-400"
                }`}>
                  {user?.role}
                </span>
              </div>
              <button onClick={logout}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/auth/register"
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}