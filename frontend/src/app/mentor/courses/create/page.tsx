"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { createCourse } from "@/services/courseService";

export default function CreateCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title:       "",
    description: "",
    level:       "beginner",
    tags:        "",
    is_gated:    false,
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const course = await createCourse({
        title:       form.title,
        description: form.description || undefined,
        level:       form.level,
        tags:        form.tags || undefined,
        is_gated:    form.is_gated,
      });
      router.push(`/mentor/courses/${course.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Create a Course</h1>
          <p className="text-gray-400 mt-1">Fill in the details — your course goes to admin for approval</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <Input
              label="Course title"
              name="title"
              placeholder="e.g. Python for Beginners"
              value={form.title}
              onChange={handleChange}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                name="description"
                rows={4}
                placeholder="What will students learn in this course?"
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Level</label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <Input
              label="Tags (comma-separated)"
              name="tags"
              placeholder="Python, ML, Data Science"
              value={form.tags}
              onChange={handleChange}
            />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_gated"
                checked={form.is_gated}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-300">
                Gated course — manually approve each student
              </span>
            </label>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} fullWidth>
                Create Course
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}