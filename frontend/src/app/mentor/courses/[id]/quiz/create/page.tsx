"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { createQuiz, addQuestion } from "@/services/quizService";

interface QuestionForm { text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; explanation: string; points: number; }
const emptyQ = (): QuestionForm => ({ text:"", option_a:"", option_b:"", option_c:"", option_d:"", correct_option:"a", explanation:"", points:1 });

export default function CreateQuizPage() {
  const params = useParams(); const router = useRouter(); const courseId = params.id as string;
  const [step, setStep] = useState<"quiz"|"questions">("quiz");
  const [quizId, setQuizId] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQ()]);
  const [quizForm, setQuizForm] = useState({ title:"", description:"", time_limit:0, pass_score:50, max_attempts:3, randomize:false });

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const quiz = await createQuiz(courseId, { title:quizForm.title, description:quizForm.description||undefined, time_limit:Number(quizForm.time_limit), pass_score:Number(quizForm.pass_score), max_attempts:Number(quizForm.max_attempts), randomize:quizForm.randomize });
      setQuizId(quiz.id); setStep("questions");
    } catch (err: any) { setError(err?.response?.data?.detail || "Failed to create quiz"); }
    finally { setLoading(false); }
  };

  const handleAddQuestions = async () => {
    if (!quizId) return; setLoading(true); setError("");
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text || !q.option_a || !q.option_b) continue;
        await addQuestion(courseId, quizId, { text:q.text, option_a:q.option_a, option_b:q.option_b, option_c:q.option_c||undefined, option_d:q.option_d||undefined, correct_option:q.correct_option, explanation:q.explanation||undefined, points:q.points, order:i });
      }
      router.push(`/mentor/courses/${courseId}`);
    } catch (err: any) { setError(err?.response?.data?.detail || "Failed to add questions"); }
    finally { setLoading(false); }
  };

  const updateQ = (idx: number, field: string, value: string|number) => { const u=[...questions]; u[idx]={...u[idx],[field]:value}; setQuestions(u); };

  return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          {["quiz","questions"].map((s,i)=>(
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step===s?"bg-indigo-600 text-white":s==="quiz"&&step==="questions"?"bg-green-700 text-white":"bg-gray-800 text-gray-500"}`}>{i+1}</div>
              <span className={`text-sm capitalize ${step===s?"text-white":"text-gray-500"}`}>{s==="quiz"?"Quiz details":"Add questions"}</span>
              {i===0&&<span className="text-gray-600 mx-1">→</span>}
            </div>
          ))}
        </div>
        {step==="quiz" ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <h1 className="text-white font-bold text-2xl mb-6">Create Quiz</h1>
            <form onSubmit={handleQuizSubmit} className="flex flex-col gap-5">
              <Input label="Quiz title" value={quizForm.title} required onChange={(e)=>setQuizForm({...quizForm,title:e.target.value})} placeholder="e.g. Python Basics Quiz"/>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Time (mins)</label><input type="number" min="0" value={quizForm.time_limit} onChange={(e)=>setQuizForm({...quizForm,time_limit:Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/><p className="text-gray-500 text-xs">0=no limit</p></div>
                <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Pass score (%)</label><input type="number" min="0" max="100" value={quizForm.pass_score} onChange={(e)=>setQuizForm({...quizForm,pass_score:Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
                <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Max attempts</label><input type="number" min="0" value={quizForm.max_attempts} onChange={(e)=>setQuizForm({...quizForm,max_attempts:Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
              </div>
              {error&&<p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" loading={loading} fullWidth>Next: Add Questions →</Button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-white font-bold text-2xl">Add Questions</h1>
              <button onClick={()=>setQuestions([...questions,emptyQ()])} className="text-sm text-indigo-400 hover:text-indigo-300">+ Add question</button>
            </div>
            <div className="flex flex-col gap-4 mb-6">
              {questions.map((q,idx)=>(
                <div key={idx} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-indigo-400 text-sm font-medium">Question {idx+1}</span>
                    {questions.length>1&&<button onClick={()=>setQuestions(questions.filter((_,i)=>i!==idx))} className="text-red-400 text-xs">Remove</button>}
                  </div>
                  <div className="flex flex-col gap-3">
                    <textarea rows={2} value={q.text} placeholder="Question text *" onChange={(e)=>updateQ(idx,"text",e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-500"/>
                    <div className="grid grid-cols-2 gap-3">
                      {["a","b","c","d"].map(opt=>(
                        <input key={opt} value={(q as any)[`option_${opt}`]} onChange={(e)=>updateQ(idx,`option_${opt}`,e.target.value)} placeholder={`Option ${opt.toUpperCase()}${opt==="a"||opt==="b"?" *":""}`} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"/>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1.5 flex-1"><label className="text-xs text-gray-400">Correct answer</label>
                        <select value={q.correct_option} onChange={(e)=>updateQ(idx,"correct_option",e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value="a">Option A</option><option value="b">Option B</option><option value="c">Option C</option><option value="d">Option D</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 w-20"><label className="text-xs text-gray-400">Points</label><input type="number" min="1" value={q.points} onChange={(e)=>updateQ(idx,"points",Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
                    </div>
                    <input value={q.explanation} placeholder="Explanation (optional)" onChange={(e)=>updateQ(idx,"explanation",e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"/>
                  </div>
                </div>
              ))}
            </div>
            {error&&<p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <Button loading={loading} fullWidth onClick={handleAddQuestions}>Save Quiz & Questions</Button>
              <Button variant="secondary" onClick={()=>router.push(`/mentor/courses/${courseId}`)}>Skip</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
