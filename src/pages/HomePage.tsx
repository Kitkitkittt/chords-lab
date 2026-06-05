import {
  ArrowRight,
  ListChecks,
  Play,
  Sparkles,
  Music
} from "lucide-react";
import { Link } from "react-router-dom";
import { courseModules, getFirstIncompleteLesson, lessons, lessonsBySlug } from "../data/course";
import { practiceModules } from "../data/practice";
import { getAdaptiveReviewSummary } from "../lib/adaptiveReview";
import { useProgress } from "../state/progress";
import { HomeInteractiveLab } from "../components/HomeInteractiveLab";
import { ProgressBar } from "../components/ProgressBar";

export function HomePage() {
  const { completedCount, progress } = useProgress();
  const resumeLesson =
    (progress.lastLessonSlug && lessonsBySlug.get(progress.lastLessonSlug)) ||
    getFirstIncompleteLesson(progress.completedLessonSlugs);
  const recentPracticeModuleId =
    Object.entries(progress.practiceMastery).sort(
      ([, left], [, right]) =>
        Date.parse(right.lastPracticedAt ?? "0") -
        Date.parse(left.lastPracticedAt ?? "0")
    )[0]?.[0] ?? "pitch";
  const continuePractice = practiceModules.find(
    (module) => module.id === recentPracticeModuleId
  ) ?? practiceModules[0];
  const reviewSummary = getAdaptiveReviewSummary(progress);
  const isFirstVisit =
    progress.completedLessonSlugs.length === 0 && !progress.lastLessonSlug;

  return (
    <div className="page-stack">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__content">
          <span className="eyebrow">Beginner reference course</span>
          <h1 id="home-title">Chords Lab</h1>
          <p>
            {isFirstVisit
              ? "Begin with Foundations: sound, pitch, octave, and note names in one short loop."
              : "Learn the symbols behind pitch, rhythm, scales, intervals, and triads through short cited lessons and small checks."}
          </p>
          <div className="hero-actions">
            <Link
              className="button"
              to={`/learn/${resumeLesson.moduleSlug}/${resumeLesson.slug}`}
            >
              Continue lesson
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--quiet" to={`/practice/${continuePractice.id}`}>
              Continue practice
            </Link>
            <Link className="button button--quiet" to="/lab/song">
              Play in Song Lab
            </Link>
            <Link className="button button--quiet" to="/instruments">
              Instrument lab
            </Link>
          </div>
        </div>
        <HomeInteractiveLab />
      </section>

      <section className="mission-map" aria-label="Today mission map">
        <Link className="mission-card" to="/review">
          <ListChecks size={19} aria-hidden="true" />
          <span>Today's review</span>
          <strong>{reviewSummary.dueSkillCount} due</strong>
          <small>
            {reviewSummary.missedPromptCount} missed prompt
            {reviewSummary.missedPromptCount === 1 ? "" : "s"} waiting
          </small>
        </Link>
        <Link
          className="mission-card"
          to={`/learn/${resumeLesson.moduleSlug}/${resumeLesson.slug}`}
        >
          <Sparkles size={19} aria-hidden="true" />
          <span>New concept</span>
          <strong>{resumeLesson.title}</strong>
          <small>{resumeLesson.estimatedMinutes} minute lesson loop</small>
        </Link>
        <Link className="mission-card" to="/lab/song">
          <Play size={19} aria-hidden="true" />
          <span>Play task</span>
          <strong>
            {progress.savedSongSketches.length > 0
              ? "Refine a sketch"
              : "Create a loop"}
          </strong>
          <small>{progress.savedSongSketches.length} saved locally</small>
        </Link>
      </section>

      <section className="workspace-band" aria-label="Current progress">
        <div className="workspace-band__main">
          <span className="eyebrow">Resume</span>
          <h2>{resumeLesson.title}</h2>
          <p>
            {resumeLesson.outcomes[0]} Keep the loop short: read, check, mark
            complete.
          </p>
          <ProgressBar
            value={completedCount}
            max={lessons.length}
            label="Completed lessons"
          />
        </div>
        <Link className="button button--quiet" to="/plan">
          Expansion plan
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="home-action-strip" aria-label="Interactive paths">
        <Link to={`/practice/${continuePractice.id}`}>
          <strong>Continue practice</strong>
          <span>{continuePractice.title}: {continuePractice.goal}</span>
        </Link>
        <Link to="/review">
          <strong>Review queue</strong>
          <span>Replay missed prompts and mixed checks without a timer.</span>
        </Link>
        <Link to="/lab/song">
          <strong>Song Lab</strong>
          <span>Build beat, bass, chord, melody, and form blocks.</span>
        </Link>
        <Link to="/instruments">
          <strong>Instrument lab</strong>
          <span>Map the same idea on piano, guitar, bass, drums, voice, and ukulele.</span>
        </Link>
      </section>

      <section className="module-grid" aria-labelledby="modules-title">
        <div className="section-heading">
          <span className="eyebrow">Course map</span>
          <h2 id="modules-title">Beginner essentials</h2>
        </div>
        <div className="module-grid__items">
          {courseModules.map((module) => (
            <Link
              key={module.slug}
              to={`/learn/${module.slug}/${module.lessonSlugs[0]}`}
              className={`module-tile module-tile--${module.colorRole}`}
            >
              <Music size={20} aria-hidden="true" />
              <strong>{module.title}</strong>
              <span>{module.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
