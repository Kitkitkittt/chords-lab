import { Bookmark, CheckCircle2, Circle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { courseModules, lessonsBySlug } from "../data/course";
import { useProgress } from "../state/progress";

type CourseRailProps = {
  currentLessonSlug?: string;
};

export function CourseRail({ currentLessonSlug }: CourseRailProps) {
  const { isLessonComplete, isLessonBookmarked } = useProgress();

  return (
    <aside className="course-rail" aria-label="Course lessons">
      <div className="course-rail__header">
        <span className="eyebrow">Course map</span>
        <strong>Beginner essentials</strong>
      </div>
      {courseModules.map((module) => (
        <section
          key={module.slug}
          className={`course-rail__module course-rail__module--${module.colorRole}`}
        >
          <h2>{module.title}</h2>
          <ol>
            {module.lessonSlugs.map((lessonSlug) => {
              const lesson = lessonsBySlug.get(lessonSlug);

              if (!lesson) {
                return null;
              }

              const complete = isLessonComplete(lesson.slug);
              const bookmarked = isLessonBookmarked(lesson.slug);

              return (
                <li key={lesson.slug}>
                  <NavLink
                    to={`/learn/${lesson.moduleSlug}/${lesson.slug}`}
                    className={
                      currentLessonSlug === lesson.slug
                        ? "course-rail__lesson is-current"
                        : "course-rail__lesson"
                    }
                  >
                    {complete ? (
                      <CheckCircle2 size={16} aria-label="Complete" />
                    ) : (
                      <Circle size={16} aria-label="Not complete" />
                    )}
                    <span>{lesson.title}</span>
                    {bookmarked ? (
                      <Bookmark size={14} aria-label="Bookmarked" />
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </aside>
  );
}
