import { ArrowRight, CheckCircle2, Clock3, Map } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CourseRail } from "../components/CourseRail";
import {
  courseModules,
  getFirstIncompleteLesson,
  lessonsBySlug
} from "../data/course";
import { useProgress } from "../state/progress";

export function LearnPage() {
  const { progress, isLessonComplete } = useProgress();
  const suggestedLesson = getFirstIncompleteLesson(progress.completedLessonSlugs);

  return (
    <div className="learn-layout">
      <CourseRail />
      <section className="learn-main" aria-labelledby="learn-title">
        <div className="section-heading">
          <span className="eyebrow">Learn</span>
          <h1 id="learn-title">Course map</h1>
          <p>
            Each module is short enough to finish in one focused session.
            Citations stay visible inside each lesson.
          </p>
        </div>

        <div className="course-constellation" aria-label="Spatial course map">
          {courseModules.map((module, moduleIndex) => (
            <section
              key={module.slug}
              className={`constellation-cluster constellation-cluster--${module.colorRole}`}
            >
              <div className="constellation-cluster__header">
                <Map size={18} aria-hidden="true" />
                <div>
                  <h2>{module.title}</h2>
                  <p>{module.description}</p>
                </div>
              </div>
              <ol className="constellation-nodes">
                {module.lessonSlugs.map((lessonSlug, lessonIndex) => {
                  const lesson = lessonsBySlug.get(lessonSlug);

                  if (!lesson) {
                    return null;
                  }

                  const complete = isLessonComplete(lesson.slug);
                  const isCurrent = progress.lastLessonSlug === lesson.slug;
                  const isSuggested = suggestedLesson.slug === lesson.slug;
                  const state = complete
                    ? "complete"
                    : isCurrent
                      ? "current"
                      : isSuggested
                        ? "suggested-next"
                        : "available";

                  return (
                    <li
                      key={lesson.slug}
                      style={
                        {
                          "--node-x": `${(lessonIndex % 3) * 22}px`,
                          "--node-y": `${(moduleIndex % 4) * 8}px`
                        } as CSSProperties
                      }
                    >
                      <Link
                        className={`constellation-node is-${state}`}
                        data-state={state}
                        to={`/learn/${lesson.moduleSlug}/${lesson.slug}`}
                      >
                        <span className="constellation-node__orb" aria-hidden="true">
                          {complete ? <CheckCircle2 size={17} /> : lessonIndex + 1}
                        </span>
                        <span>
                          <strong>{lesson.title}</strong>
                          <small>
                            {state === "suggested-next"
                              ? "Suggested next"
                              : state === "current"
                                ? "Resume point"
                                : state}
                            {" · "}
                            {lesson.estimatedMinutes} min
                          </small>
                        </span>
                        <ArrowRight size={17} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <div className="module-list module-list--scan">
          {courseModules.map((module) => (
            <section
              key={module.slug}
              className={`module-section module-section--${module.colorRole}`}
            >
              <div>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>
              <ol>
                {module.lessonSlugs.map((lessonSlug) => {
                  const lesson = lessonsBySlug.get(lessonSlug);

                  if (!lesson) {
                    return null;
                  }

                  return (
                    <li key={lesson.slug}>
                      <Link
                        className="lesson-row"
                        to={`/learn/${lesson.moduleSlug}/${lesson.slug}`}
                      >
                        {isLessonComplete(lesson.slug) ? (
                          <CheckCircle2 size={18} aria-label="Complete" />
                        ) : (
                          <Clock3 size={18} aria-label="Not complete" />
                        )}
                        <span>
                          <strong>{lesson.title}</strong>
                          <small>{lesson.estimatedMinutes} min</small>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
