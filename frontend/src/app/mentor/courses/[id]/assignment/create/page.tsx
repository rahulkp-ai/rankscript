"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { createAssignment } from "@/services/assignmentService";

export default function CreateAssignmentPage() {
  const params=useParams(); const router=useRouter(); const courseId=params.id as string;
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [form,setForm]=useState({ title:"", description:"", instructions:"", max_score:100, passing_score:50, deadline:"", late_penalty:10, allow_late:true });

  const handleChange=(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{
    const{name,value,type}=e.target;
    setForm({...form,[name]:type==="checkbox"?(e.target as HTMLInputElement).checked:value});
  };

  const handleSubmit=async(e: React.FormEvent)=>{
    e.preventDefault(); setLoading(true); setError("");
    try {
      await createAssignment(courseId,{ title:form.title, description:form.description||undefined, instructions:form.instructions||undefined, max_score:Number(form.max_score), passing_score:Number(form.passing_score), deadline:form.deadline||undefined, late_penalty:Number(form.late_penalty), allow_late:form.allow_late } as any);
      router.push(`/mentor/courses/${courseId}`);
    } catch(err: any){ setError(err?.response?.data?.detail||"Failed to create assignment"); }
    finally{ setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950"><Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Create Assignment</h1>
        <p className="text-gray-400 mb-8">Students will submit text answers</p>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input label="Title" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Build a Python Calculator" required/>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Description</label><textarea name="description" rows={3} value={form.description} onChange={handleChange} placeholder="Brief overview" className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-500"/></div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Instructions</label><textarea name="instructions" rows={5} value={form.instructions} onChange={handleChange} placeholder="Detailed instructions..." className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-500"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Max score</label><input type="number" name="max_score" min="1" value={form.max_score} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Passing score</label><input type="number" name="passing_score" min="0" value={form.passing_score} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
            </div>
            <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Deadline (optional)</label><input type="datetime-local" name="deadline" value={form.deadline} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-300">Late penalty (%/day)</label><input type="number" name="late_penalty" min="0" max="100" value={form.late_penalty} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/></div>
              <div className="flex items-end pb-2"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="allow_late" checked={form.allow_late} onChange={handleChange} className="w-4 h-4 rounded accent-indigo-600"/><span className="text-sm text-gray-300">Allow late submissions</span></label></div>
            </div>
            {error&&<p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} fullWidth>Create Assignment</Button>
              <Button type="button" variant="secondary" onClick={()=>router.back()}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
