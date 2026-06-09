import { MDXProvider } from "@mdx-js/react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Headphones,
  Music,
  RotateCcw,
  Target
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CourseRail } from "../components/CourseRail";
import { LessonCheckpoint } from "../components/LessonCheckpoint";
import { lessonComponents } from "../components/lessonComponentMap";
import { getAdjacentLessons, getFirstIncompleteLesson, lessonsBySlug, modulesBySlug } from "../data/course";
import { lessonLinkFor } from "../data/lessonLinks";
import { useProgress } from "../state/progress";
import type { LessonCheckpointResult } from "../types/course";

export function LessonPage() {
  const { moduleSlug, lessonSlug } = useParams();
  const lesson = lessonSlug ? lessonsBySlug.get(lessonSlug) : undefined;
  const module = moduleSlug ? modulesBySlug.get(moduleSlug) : undefined;
  const {
    isLessonBookmarked,
    isLessonComplete,
    markLessonComplete,
    progress,
    recordPracticeResult,
    setLastLesson,
    toggleBookmark
  } = useProgress();

  useEffect(() => {
    if (lesson) {
      setLastLesson(lesson.slug);
    }
  }, [lesson, setLastLesson]);

  const handleCheckpointPass = useCallback(
    (result: LessonCheckpointResult) => {
      if (result.passed) {
        markLessonComplete(result.lessonSlug);
      }
    },
    [markLessonComplete]
  );

  if (!lesson || !module || lesson.moduleSlug !== module.slug) {
    return <Navigate to="/learn" replace />;
  }

  const { previous, next } = getAdjacentLessons(lesson.slug);
  const bookmarked = isLessonBookmarked(lesson.slug);
  const complete = isLessonComplete(lesson.slug);
  const LessonContent = lesson.Component;
  const lessonLink = lessonLinkFor(lesson.slug);
  const practiceRoute = lessonLink.practiceRoute;
  const checkpointModule = lessonLink.checkpointModule;
  // When this is the last lesson in the list, recommend the next still-incomplete
  // lesson (skipping the current one) instead of dead-ending on /progress.
  const firstIncomplete = getFirstIncompleteLesson(progress.completedLessonSlugs);
  const nextRecommended =
    firstIncomplete.slug !== lesson.slug ? firstIncomplete : undefined;

  return (
    <div className="lesson-layout">
      <CourseRail currentLessonSlug={lesson.slug} />
      <article className="lesson-reader" aria-labelledby="lesson-title">
        <header className="lesson-reader__header">
          <span className="eyebrow">{module.title}</span>
          <h1 id="lesson-title">{lesson.title}</h1>
          <p>
            {lesson.estimatedMinutes} min. Outcomes:{" "}
            {lesson.outcomes.join("; ")}.
          </p>
          <div className="lesson-reader__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={() => toggleBookmark(lesson.slug)}
            >
              {bookmarked ? (
                <BookmarkCheck size={18} aria-hidden="true" />
              ) : (
                <Bookmark size={18} aria-hidden="true" />
              )}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
            <button
              className="button"
              type="button"
              onClick={() => markLessonComplete(lesson.slug)}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              {complete ? "Complete" : "Mark complete"}
            </button>
          </div>
        </header>

        <div className="lesson-body">
          <MDXProvider components={lessonComponents}>
            <LessonContent />
          </MDXProvider>
        </div>

        <section className="lesson-doing" aria-labelledby="lesson-doing-title">
          <span className="eyebrow">Learn by doing</span>
          <h2 id="lesson-doing-title">Apply this lesson</h2>
          <div className="lesson-doing__grid">
            <Link to={practiceRoute}>
              <Target size={18} aria-hidden="true" />
              <strong>Practice this</strong>
              <span>{lesson.outcomes[0]}</span>
            </Link>
            <Link to="/practice/ear/setup">
              <Headphones size={18} aria-hidden="true" />
              <strong>Hear it</strong>
              <span>Replay the sound before checking the answer.</span>
            </Link>
            <Link to="/lab/song">
              <Music size={18} aria-hidden="true" />
              <strong>Use it in Song Lab</strong>
              <span>Put the idea into an eight-bar sketch.</span>
            </Link>
            <Link to="/review">
              <RotateCcw size={18} aria-hidden="true" />
              <strong>Review later</strong>
              <span>Mix missed prompts with due skills.</span>
            </Link>
          </div>
        </section>

        <LessonCheckpoint
          lessonSlug={lesson.slug}
          lessonTitle={lesson.title}
          moduleId={checkpointModule}
          audioEnabled={progress.settings.audioEnabled}
          onAttempt={recordPracticeResult}
          onPass={handleCheckpointPass}
        />

        <footer className="lesson-reader__footer">
          <nav className="lesson-pager" aria-label="Lesson navigation">
            {previous ? (
              <Link
                className="button button--quiet"
                to={`/learn/${previous.moduleSlug}/${previous.slug}`}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Previous
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                className="button"
                to={`/learn/${next.moduleSlug}/${next.slug}`}
              >
                Next
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : nextRecommended ? (
              <Link
                className="button"
                to={`/learn/${nextRecommended.moduleSlug}/${nextRecommended.slug}`}
              >
                Next: {nextRecommended.title}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <Link className="button" to="/progress">
                You finished the course
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )}
          </nav>
        </footer>
      </article>

      <aside className="lesson-context" aria-label="Lesson sources">
        <section>
          <span className="eyebrow">Sources</span>
          <ul>
            {lesson.citations.map((citation) => (
              <li key={citation.url}>
                <a href={citation.url} target="_blank" rel="noreferrer">
                  {citation.label}
                </a>
                <small>{citation.licenseNote}</small>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <span className="eyebrow">Prerequisites</span>
          {lesson.prerequisites.length > 0 ? (
            <ul>
              {lesson.prerequisites.map((slug) => {
                const prerequisite = lessonsBySlug.get(slug);
                return prerequisite ? (
                  <li key={slug}>
                    <Link
                      to={`/learn/${prerequisite.moduleSlug}/${prerequisite.slug}`}
                    >
                      {prerequisite.title}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
