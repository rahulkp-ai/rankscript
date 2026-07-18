"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";

const INDIA_STATES: Record<string, string[]> = {
  "Kerala": ["Thiruvananthapuram","Kollam","Pathanamthitta","Alappuzha","Kottayam","Idukki","Ernakulam","Thrissur","Palakkad","Malappuram","Kozhikode","Wayanad","Kannur","Kasaragod"],
  "Karnataka": ["Bengaluru Urban","Bengaluru Rural","Mysuru","Mangaluru","Hubballi","Belagavi","Kalaburagi","Ballari","Tumakuru","Shivamogga"],
  "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Vellore","Erode","Thoothukudi","Dindigul"],
  "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Nellore","Kurnool","Rajahmundry","Tirupati","Kadapa","Anantapur","Eluru"],
  "Telangana": ["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam","Mahbubnagar","Nalgonda","Adilabad","Suryapet"],
  "Maharashtra": ["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Amravati","Kolhapur","Thane","Navi Mumbai"],
  "Delhi": ["Central Delhi","East Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"],
  "Gujarat": ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Junagadh","Gandhinagar","Anand","Bharuch"],
  "Rajasthan": ["Jaipur","Jodhpur","Kota","Bikaner","Ajmer","Udaipur","Bhilwara","Alwar","Bharatpur","Sikar"],
  "West Bengal": ["Kolkata","Howrah","Durgapur","Asansol","Siliguri","Bardhaman","Malda","Barasat","Krishnanagar","Jalpaiguri"],
  "Uttar Pradesh": ["Lucknow","Kanpur","Varanasi","Agra","Prayagraj","Meerut","Ghaziabad","Noida","Mathura","Aligarh"],
  "Bihar": ["Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Darbhanga","Bihar Sharif","Arrah","Begusarai","Katihar"],
  "Madhya Pradesh": ["Bhopal","Indore","Jabalpur","Gwalior","Ujjain","Sagar","Dewas","Satna","Ratlam","Rewa"],
  "Punjab": ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Hoshiarpur","Gurdaspur","Ferozepur","Moga"],
  "Haryana": ["Faridabad","Gurgaon","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal","Sonipat","Panchkula"],
  "Other": ["Other"],
};

const STATE_LIST = Object.keys(INDIA_STATES).sort();

interface PasswordStrength {
  score:    number;
  label:    string;
  color:    string;
  checks:   { label: string; ok: boolean }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: "At least 8 characters",     ok: password.length >= 8 },
    { label: "At least one uppercase",     ok: /[A-Z]/.test(password) },
    { label: "At least one number",        ok: /[0-9]/.test(password) },
    { label: "At least one special char",  ok: /[!@#$%^&*()_+=\[\]{};':"\\|,.<>/?-]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const label = score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const color = score <= 1 ? "bg-red-500" : score === 2 ? "bg-amber-500" : score === 3 ? "bg-blue-500" : "bg-green-500";
  return { score, label, color, checks };
}

function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [districts, setDistricts] = useState<string[]>([]);

  const [form, setForm] = useState({
    name:     "",
    email:    "",
    role:     searchParams.get("role") || "student",
    state:    "",
    district: "",
    password: "",
    confirm:  "",
  });

  const strength = getPasswordStrength(form.password);

  useEffect(() => {
    if (form.state) {
      setDistricts(INDIA_STATES[form.state] || []);
      setForm((prev) => ({ ...prev, district: "" }));
    }
  }, [form.state]);

  const validate = (): string => {
    if (!form.name.trim())  return "Full name is required";
    if (!form.email.trim()) return "Email is required";
    if (!form.state)        return "Please select your state";
    if (!form.district)     return "Please select your district";
    if (strength.score < 4) return "Password too weak — must meet all 4 requirements (8+ chars, uppercase, number, special char)";
    if (form.password !== form.confirm) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      await register({
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role as "student" | "mentor",
        state:    form.state,
        district: form.district,
        country:  "India",
      });
      router.push("/student/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
            <span>🏆</span> RankScript
          </Link>
          <p className="text-gray-400 mt-2">Create your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <Input label="Full name" value={form.name} required
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="e.g. Rahul KP Kurup"/>

            <Input label="Email" type="email" value={form.email} required
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="you@example.com"/>

            {/* Role selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {["student","mentor"].map((r) => (
                  <button key={r} type="button"
                    onClick={() => setForm({...form, role: r})}
                    className={`py-2.5 rounded-lg text-sm font-medium capitalize transition-colors border ${
                      form.role === r
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                    }`}>
                    {r === "student" ? "🎓 Student" : "👨‍🏫 Mentor"}
                  </button>
                ))}
              </div>
            </div>

            {/* State dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">State</label>
              <select value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} required
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select state</option>
                {STATE_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* District dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">District</label>
              <select value={form.district} onChange={(e) => setForm({...form, district: e.target.value})}
                disabled={!form.state} required
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                <option value="">Select district</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <input type="password" value={form.password} required
                onChange={(e) => setForm({...form, password: e.target.value})}
                placeholder="Create a strong password"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>

              {/* Strength bar */}
              {form.password && (
                <div className="mt-1">
                  <div className="flex gap-1 mb-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : "bg-gray-700"
                      }`}/>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {strength.checks.map((c) => (
                      <p key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? "text-green-400" : "text-gray-500"}`}>
                        <span>{c.ok ? "✓" : "○"}</span> {c.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Confirm password</label>
              <input type="password" value={form.confirm} required
                onChange={(e) => setForm({...form, confirm: e.target.value})}
                placeholder="Repeat your password"
                className={`w-full px-4 py-2.5 rounded-lg bg-gray-800 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  form.confirm && form.password !== form.confirm ? "border-red-600" : "border-gray-600"
                }`}/>
              {form.confirm && form.password !== form.confirm && (
                <p className="text-red-400 text-xs">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth>Create account</Button>

            <p className="text-center text-gray-500 text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
