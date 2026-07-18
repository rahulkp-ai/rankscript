"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import CourseCard from "@/components/course/CourseCard";
import { getCourses, Course } from "@/services/courseService";
import { getMyEnrollments, Enrollment } from "@/services/enrollmentService";
import { useAuth } from "@/hooks/useAuth";

export default function CoursesPage() {
  const { isAuthenticated } = useAuth();
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [level,       setLevel]       = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const { courses } = await getCourses();
        setCourses(courses);
        if (isAuthenticated) {
          const enr = await getMyEnrollments();
          setEnrollments(enr);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const enrolledIds = new Set(enrollments.map((e) => e.course_id));
  const progressMap = Object.fromEntries(enrollments.map((e) => [e.course_id, e.progress]));

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchLevel  = level === "all" || c.level === level;
    return matchSearch && matchLevel;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Courses</h1>
          <p className="text-gray-400">Learn from expert mentors and climb the rankings</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Courses grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
                <div className="w-full h-36 bg-gray-800 rounded-xl mb-4"/>
                <div className="h-4 bg-gray-800 rounded w-2/3 mb-2"/>
                <div className="h-3 bg-gray-800 rounded w-full mb-1"/>
                <div className="h-3 bg-gray-800 rounded w-4/5"/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📚</p>
            <p className="text-gray-400">No courses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrolled={enrolledIds.has(course.id)}
                progress={progressMap[course.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}