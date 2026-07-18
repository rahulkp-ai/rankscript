import Link from "next/link";
import Image from "next/image";
import { Course } from "@/services/courseService";

interface CourseCardProps {
  course:    Course;
  enrolled?: boolean;
  progress?: number;
  isMentor?: boolean;
  onDelete?: (course: Course) => void;
}

const levelColors: Record<string, string> = {
  beginner:     "bg-green-900/50 text-green-400",
  intermediate: "bg-amber-900/50 text-amber-400",
  advanced:     "bg-red-900/50 text-red-400",
};

export default function CourseCard({ course, enrolled, progress, isMentor, onDelete }: CourseCardProps) {
  const href = isMentor ? `/mentor/courses/${course.id}` : `/courses/${course.id}`;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(course);
  };

  return (
    <div className="relative group">
      <Link href={href}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-indigo-800/50 transition-all hover:scale-[1.01] cursor-pointer h-full flex flex-col">
          <div className="relative w-full h-36 bg-gray-800 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
            {course.thumbnail
              ? <Image src={course.thumbnail} alt={course.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover rounded-xl" unoptimized={course.thumbnail.startsWith("http")} />
              : <span className="text-4xl">📚</span>}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${levelColors[course.level] || "bg-gray-800 text-gray-400"}`}>
              {course.level}
            </span>
            {enrolled && <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-900/50 text-indigo-400">Enrolled</span>}
            {isMentor && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize ${
                course.status === "approved" ? "bg-green-900/50 text-green-400" :
                course.status === "pending"  ? "bg-yellow-900/50 text-yellow-400" :
                "bg-gray-800 text-gray-400"
              }`}>{course.status}</span>
            )}
          </div>
          <h3 className="text-white font-semibold text-base mb-2 line-clamp-2 flex-1">{course.title}</h3>
          {course.description && <p className="text-gray-400 text-sm line-clamp-2 mb-4">{course.description}</p>}
          {enrolled && typeof progress === "number" && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span><span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full">
                <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}/>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-800">
            <span>{course.total_lessons} lessons</span>
            <span>{course.total_enrolled} enrolled</span>
          </div>
        </div>
      </Link>

      {/* Delete button overlay for mentor view */}
      {isMentor && onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700 hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100"
          title="Delete course"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
