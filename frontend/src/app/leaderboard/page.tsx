"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import LeaderboardTable from "@/components/ranking/LeaderboardTable";
import { getIndianLeaderboard, getStateLeaderboard, getDistrictLeaderboard, getMyRank, LeaderboardResponse, MyRankResponse } from "@/services/rankingService";
import { useAuth } from "@/hooks/useAuth";

type Tab = "global" | "state" | "district";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab,    setActiveTab]    = useState<Tab>("global");
  const [leaderboard,  setLeaderboard]  = useState<LeaderboardResponse | null>(null);
  const [myRank,       setMyRank]       = useState<MyRankResponse | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const loadMyRank = async () => {
      try {
        const r = await getMyRank();
        setMyRank(r);
      } catch (err) { console.error(err); }
    };
    loadMyRank();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let data: LeaderboardResponse;
        if (activeTab === "global") {
          data = await getIndianLeaderboard();
        } else if (activeTab === "state" && user?.state) {
          data = await getStateLeaderboard(user.state);
        } else if (activeTab === "district" && user?.district) {
          data = await getDistrictLeaderboard(user.district);
        } else {
          data = await getIndianLeaderboard();
        }
        setLeaderboard(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, user]);

  const scoreBar = (label: string, score: number, color: string) => (
    <div key={label}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{score.toFixed(1)}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }}/>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">🏆 Leaderboard</h1>
          <p className="text-gray-400">Compete with students across Kerala and beyond</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — leaderboard */}
          <div className="lg:col-span-2">

            {/* Tab selector */}
            <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
              {([
                { key: "global",   label: "🇮🇳 India" },
                { key: "state",    label: `📍 ${user?.state || "State"}` },
                { key: "district", label: `🏘️ ${user?.district || "District"}` },
              ] as const).map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Total count */}
            {leaderboard && (
              <p className="text-gray-500 text-sm mb-4">
                {leaderboard.total} student{leaderboard.total !== 1 ? "s" : ""} ranked
              </p>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-16"/>
                ))}
              </div>
            ) : (
              <LeaderboardTable
                entries={leaderboard?.entries || []}
                myRank={
                  activeTab === "global"   ? leaderboard?.my_rank :
                  activeTab === "state"    ? myRank?.state_rank :
                  myRank?.district_rank
                }
              />
            )}
          </div>

          {/* Right — my stats */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-20">
              <h2 className="text-white font-semibold mb-4">Your Stats</h2>

              {myRank ? (
                <>
                  {/* Rank positions */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                      { label: "India",   rank: myRank.indian_rank },
                      { label: user?.state || "State", rank: myRank.state_rank },
                      { label: user?.district || "District", rank: myRank.district_rank },
                    ].map((r) => (
                      <div key={r.label} className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-indigo-400 font-bold text-lg">
                          {r.rank ? `#${r.rank}` : "—"}
                        </p>
                        <p className="text-gray-500 text-xs truncate">{r.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Score breakdown */}
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Total score</span>
                      <span className="text-white font-bold text-lg">{myRank.rank_score.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full">
                      <div className="h-2 bg-indigo-500 rounded-full"
                        style={{ width: `${myRank.rank_score}%` }}/>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {scoreBar("Quiz (×0.4)",       myRank.quiz_score,       "bg-blue-500")}
                    {scoreBar("Assignment (×0.3)",  myRank.assignment_score, "bg-green-500")}
                    {scoreBar("Completion (×0.15)", myRank.completion_score, "bg-amber-500")}
                    {scoreBar("Streak (×0.15)",     myRank.streak_score,     "bg-purple-500")}
                  </div>

                  {/* XP + streak */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-amber-400 font-bold text-xl">{myRank.xp.toFixed(0)}</p>
                      <p className="text-gray-500 text-xs">XP</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-orange-400 font-bold text-xl">{myRank.streak_days} 🔥</p>
                      <p className="text-gray-500 text-xs">Day streak</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Complete courses and quizzes to get ranked!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}