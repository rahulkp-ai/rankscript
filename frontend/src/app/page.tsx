import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="border-b border-gray-800/50 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="font-bold text-lg tracking-tight">RankScript</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/auth/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-800/50 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          🚀 Built for competitive learners
        </div>
        <h1 className="text-6xl font-black mb-6 leading-tight">
          Learn. Compete.<br/>
          <span className="text-indigo-400">Rank Up.</span>
        </h1>
        <p className="text-gray-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          A competitive learning platform where students battle for top spots on
          district, state, and national leaderboards — while mentors guide the way.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register?role=student"
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors text-base">
            🎓 Join as Student
          </Link>
          <Link href="/auth/register?role=mentor"
            className="px-8 py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors text-base border border-gray-700">
            👨‍🏫 Apply as Mentor
          </Link>
        </div>
      </div>

      {/* Ranking formula */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-3">Ranking Formula</p>
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { label: "Quiz", weight: "0.4", color: "text-blue-400" },
              { label: "Assignment", weight: "0.3", color: "text-green-400" },
              { label: "Completion", weight: "0.15", color: "text-amber-400" },
              { label: "Streak", weight: "0.15", color: "text-orange-400" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`font-mono text-sm ${item.color}`}>
                  ({item.label} × {item.weight})
                </span>
                {i < 3 && <span className="text-gray-600">+</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "🎓", title: "Students", desc: "Enroll in courses, watch video lessons, submit assignments, take quizzes, and climb the leaderboard." },
            { icon: "👨‍🏫", title: "Mentors", desc: "Create structured courses with video lessons, quizzes, and assignments. Track your students' progress." },
            { icon: "🏆", title: "Rankings", desc: "Compete locally — district, state, and national leaderboards with real-time rank scoring." },
          ].map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-800/50 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-3 gap-6">
          {[
            { value: "3", label: "User roles", note: "Student, Mentor, Admin" },
            { value: "4", label: "Ranking levels", note: "Indian, State, District, Institution" },
            { value: "4", label: "Score factors", note: "Quiz, Assignment, Completion, Streak" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-indigo-400 mb-1">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to rank up?</h2>
          <p className="text-gray-400 mb-6">Pick your role and get started in 30 seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register?role=student"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
              🎓 Join as Student
            </Link>
            <Link href="/auth/register?role=mentor"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700">
              👨‍🏫 Apply as Mentor
            </Link>
            <Link href="/auth/login"
              className="px-6 py-3 text-gray-400 hover:text-white rounded-xl font-medium transition-colors">
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
