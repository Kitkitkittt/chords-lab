import {
  ArrowRight,
  Compass,
  Dumbbell,
  Guitar,
  ListChecks,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Music
} from "lucide-react";
import { Link } from "react-router-dom";
import { courseModules, getFirstIncompleteLesson, lessons, lessonsBySlug } from "../data/course";
import { practiceModules } from "../data/practice";
import { getAdaptiveReviewSummary } from "../lib/adaptiveReview";
import { recommendSkills, trackProgressList } from "../lib/learningPath";
import { useProgress } from "../state/progress";
import { HomeInteractiveLab } from "../components/HomeInteractiveLab";
import { HeroChordPlay } from "../components/HeroChordPlay";
import { ProgressBar } from "../components/ProgressBar";

export function HomePage() {
  const { completedCount, progress, setActiveTrack } = useProgress();
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
  const skillRecommendations = recommendSkills(
    progress,
    3,
    new Date(),
    progress.settings.activeTrackId
  );
  const tracks = trackProgressList(progress);
  const activeTrackId = progress.settings.activeTrackId;
  const isFirstVisit =
    progress.completedLessonSlugs.length === 0 && !progress.lastLessonSlug;

  return (
    <div className="page-stack">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__content">
          <span className="eyebrow">Local-first music theory</span>
          <h1 id="home-title">Chords Lab</h1>
          <p className="home-hero__lede">
            {isFirstVisit
              ? "Learn music theory by playing it. Build chords, hear them, and read the symbols behind the sound — calm, hands-on, no account."
              : "Pick up where you left off. Short cited lessons, generated practice, ear training, and a Song Lab — all in one calm workspace."}
          </p>
          <div className="hero-actions">
            <Link
              className="button"
              to={`/learn/${resumeLesson.moduleSlug}/${resumeLesson.slug}`}
            >
              {isFirstVisit ? "Start learning" : "Continue lesson"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--quiet" to={`/practice/${continuePractice.id}`}>
              Continue practice
            </Link>
          </div>
          <dl className="hero-stats" aria-label="What's inside">
            <div>
              <dt>{lessons.length}</dt>
              <dd>cited lessons</dd>
            </div>
            <div>
              <dt>{practiceModules.length}</dt>
              <dd>practice modules</dd>
            </div>
            <div>
              <dt>{completedCount}</dt>
              <dd>lessons done</dd>
            </div>
          </dl>
          <p className="home-hero__note">
            No accounts. No timers. Works offline. Progress stays on your device.
          </p>
        </div>
        <HeroChordPlay />
      </section>

      <HomeInteractiveLab />

      <section className="home-section" aria-labelledby="today-title">
        <div className="section-heading">
          <span className="eyebrow">Today</span>
          <h2 id="today-title">Pick up where you left off</h2>
        </div>
        <div className="mission-map">
          <Link className="mission-card" to="/review">
          <ListChecks size={19} aria-hidden="true" />
          <span>Today's review</span>
          <strong>
            {reviewSummary.dueSkillCount === 0 &&
            reviewSummary.missedPromptCount === 0
              ? "All clear"
              : `${reviewSummary.dueSkillCount} due`}
          </strong>
          <small>
            {reviewSummary.dueSkillCount === 0 &&
            reviewSummary.missedPromptCount === 0
              ? "Nothing due today. A short review still helps."
              : `${reviewSummary.missedPromptCount} missed prompt${
                  reviewSummary.missedPromptCount === 1 ? "" : "s"
                } waiting`}
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
        </div>
      </section>

      {skillRecommendations.length > 0 ? (
        <section className="skill-recommendations" aria-label="Suggested focus">
          <div className="skill-recommendations__header">
            <Target size={19} aria-hidden="true" />
            <h2>Suggested focus</h2>
            <p>Soft suggestions from your local progress. Nothing is locked.</p>
          </div>
          <div className="skill-recommendations__grid">
            {skillRecommendations.map((recommendation) => (
              <Link
                key={recommendation.skill.id}
                className="skill-recommendation-card"
                to={`/practice/${recommendation.skill.moduleId}/setup`}
              >
                <strong>{recommendation.skill.title}</strong>
                <small>{recommendation.detail}</small>
                <span className="skill-recommendation-card__cta">
                  Practice <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="learning-tracks" aria-label="Learning tracks">
        <div className="learning-tracks__header">
          <h2>Learning tracks</h2>
          <p>Pursue these in parallel. Set one as your focus to steer suggestions.</p>
        </div>
        <div className="learning-tracks__grid">
          {tracks.map((track) => {
            const isActive = activeTrackId === track.track.id;

            return (
              <article
                key={track.track.id}
                className={
                  isActive
                    ? "learning-track-card is-active"
                    : "learning-track-card"
                }
              >
                <h3>{track.track.title}</h3>
                <p>{track.track.summary}</p>
                <ProgressBar
                  value={Math.round(track.mastery * 100)}
                  max={100}
                  label={`${track.track.title} mastery`}
                />
                {track.nextSkill ? (
                  <Link
                    className="learning-track-card__next"
                    to={`/practice/${track.nextSkill.moduleId}/setup`}
                  >
                    {track.hasReviewDue ? "Review" : "Next"}: {track.nextSkill.title}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="learning-track-card__done">Track mastered</span>
                )}
                <button
                  type="button"
                  className="button button--quiet learning-track-card__focus"
                  aria-pressed={isActive}
                  onClick={() =>
                    setActiveTrack(isActive ? undefined : track.track.id)
                  }
                >
                  {isActive ? "Clear focus" : "Set as focus"}
                </button>
              </article>
            );
          })}
        </div>
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

      <section className="home-section" aria-labelledby="explore-title">
        <div className="section-heading">
          <span className="eyebrow">Explore</span>
          <h2 id="explore-title">Ways to play and practice</h2>
        </div>
        <div className="home-action-strip">
          <Link to={`/practice/${continuePractice.id}`}>
            <Dumbbell size={20} aria-hidden="true" />
            <strong>Practice</strong>
            <span>{continuePractice.title}: {continuePractice.goal}</span>
          </Link>
          <Link to="/review">
            <RotateCcw size={20} aria-hidden="true" />
            <strong>Review queue</strong>
            <span>Replay missed prompts and mixed checks without a timer.</span>
          </Link>
          <Link to="/tools/circle">
            <Compass size={20} aria-hidden="true" />
            <strong>Theory tools</strong>
            <span>Circle of fifths and a chord-progression playground.</span>
          </Link>
          <Link to="/instruments">
            <Guitar size={20} aria-hidden="true" />
            <strong>Instrument lab</strong>
            <span>Play piano, guitar, bass, drums, voice, and ukulele.</span>
          </Link>
        </div>
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
