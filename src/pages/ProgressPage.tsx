import { Download, RotateCcw, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ProgressBar } from "../components/ProgressBar";
import { lessons, lessonsBySlug } from "../data/course";
import { practiceModules, getPracticePrompts } from "../data/practice";
import { overallMastery, skillProgressList } from "../lib/learningPath";
import { useProgress } from "../state/progress";

export function ProgressPage() {
  const {
    completedCount,
    progress,
    isLessonComplete,
    resetProgress,
    setAudioEnabled,
    setReducedMotion
  } = useProgress();

  const bookmarkedLessons = progress.bookmarkedLessonSlugs
    .map((slug) => lessonsBySlug.get(slug))
    .filter(Boolean);
  const skillAreas = skillProgressList(progress);
  const masteryPercent = Math.round(overallMastery(progress) * 100);
  const attemptedChecks = Object.values(progress.checkResults).reduce(
    (sum, result) => sum + result.attempted,
    0
  );
  const correctChecks = Object.values(progress.checkResults).reduce(
    (sum, result) => sum + result.correct,
    0
  );
  const attemptedPractice = Object.values(progress.practiceResults).reduce(
    (sum, result) => sum + result.attempted,
    0
  );
  const correctPractice = Object.values(progress.practiceResults).reduce(
    (sum, result) => sum + result.correct,
    0
  );

  return (
    <div className="page-stack">
      <section className="section-heading">
        <span className="eyebrow">Progress</span>
        <h1>This device</h1>
        <p>
          Completion, bookmarks, settings, and check attempts are stored only in
          this browser.
        </p>
      </section>

      <section className="workspace-band">
        <div className="workspace-band__main">
          <ProgressBar
            value={completedCount}
            max={lessons.length}
            label="Completed lessons"
          />
          <p>
            Micro-check score: {correctChecks} correct from {attemptedChecks}{" "}
            attempts.
          </p>
          <p>
            Practice score: {correctPractice} correct from {attemptedPractice}{" "}
            attempts.
          </p>
          <p>
            Generated sessions: {progress.generatedSessionHistory.length}. Saved
            Song Lab sketches: {progress.savedSongSketches.length}.
          </p>
          <p>
            Sync: {progress.sync.enabled ? progress.sync.provider : "local only"}.
          </p>
        </div>
        <div className="settings-panel" aria-label="Learning settings">
          <h2>
            <Settings2 size={18} aria-hidden="true" />
            Settings
          </h2>
          <label>
            <input
              type="checkbox"
              checked={progress.settings.audioEnabled}
              onChange={(event) => setAudioEnabled(event.currentTarget.checked)}
            />
            Audio examples enabled
          </label>
          <label>
            <input
              type="checkbox"
              checked={progress.settings.reducedMotion}
              onChange={(event) => setReducedMotion(event.currentTarget.checked)}
            />
            Reduce motion
          </label>
          <button className="button button--quiet" type="button" onClick={resetProgress}>
            <RotateCcw size={18} aria-hidden="true" />
            Reset local progress
          </button>
          <Link className="button button--secondary" to="/progress/export">
            <Download size={18} aria-hidden="true" />
            Export / import
          </Link>
        </div>
      </section>

      <section className="lesson-progress-list" aria-labelledby="practice-progress">
        <h2 id="practice-progress">Practice modules</h2>
        <ol>
          {practiceModules.map((module) => {
            const promptIds = getPracticePrompts(module.id).map(
              (prompt) => prompt.id
            );
            const mastery = progress.practiceMastery[module.id];
            const score = promptIds.reduce(
              (total, promptId) => {
                const result = progress.practiceResults[promptId];

                return {
                  correct: total.correct + (result?.correct ?? 0),
                  attempted: total.attempted + (result?.attempted ?? 0)
                };
              },
              { correct: 0, attempted: 0 }
            );

            return (
              <li key={module.id}>
                <Link to={`/practice/${module.id}`}>
                  <span>{module.title}</span>
                  <strong>
                    {score.attempted > 0
                      ? `${score.correct}/${score.attempted} · streak ${
                          mastery?.streak ?? 0
                        }`
                      : module.status}
                  </strong>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="lesson-progress-list" aria-labelledby="skill-areas">
        <h2 id="skill-areas">Skills by area</h2>
        <p>Overall mastery: {masteryPercent}% across {skillAreas.length} skills.</p>
        <ol>
          {skillAreas.map((item) => (
            <li key={item.skill.id}>
              <Link to={`/practice/${item.skill.moduleId}/setup`}>
                <span>{item.skill.title}</span>
                <strong>
                  {item.level}
                  {item.attempted > 0
                    ? ` · ${item.correct}/${item.attempted}`
                    : " · not started"}
                  {item.due ? " · review due" : ""}
                </strong>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="lesson-progress-list" aria-labelledby="skill-progress">
        <h2 id="skill-progress">Skill mastery</h2>
        {Object.keys(progress.skillMastery).length > 0 ? (
          <ol>
            {Object.entries(progress.skillMastery).map(([skill, mastery]) => (
              <li key={skill}>
                <span>{skill}</span>
                <strong>
                  {mastery.correct}/{mastery.attempted} · review{" "}
                  {mastery.reviewQueue.length} · due{" "}
                  {mastery.dueAt ? new Date(mastery.dueAt).toLocaleDateString() : "now"}
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No generated skill attempts yet.</p>
        )}
      </section>

      <section className="lesson-progress-list" aria-labelledby="session-history">
        <h2 id="session-history">Generated sessions</h2>
        {progress.generatedSessionHistory.length > 0 ? (
          <ol>
            {progress.generatedSessionHistory.slice(0, 8).map((session) => (
              <li key={session.id}>
                <Link to={`/practice/${session.moduleId}`}>
                  <span>
                    {session.moduleId} · {session.configSummary}
                  </span>
                  <strong>
                    {session.correct}/{session.attempted}
                  </strong>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p>No generated sessions completed yet.</p>
        )}
      </section>

      <section className="lesson-progress-list" aria-labelledby="lesson-progress">
        <h2 id="lesson-progress">Lessons</h2>
        <ol>
          {lessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link to={`/learn/${lesson.moduleSlug}/${lesson.slug}`}>
                <span>{lesson.title}</span>
                <strong>{isLessonComplete(lesson.slug) ? "Complete" : "Open"}</strong>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="bookmark-list" aria-labelledby="bookmarks-title">
        <h2 id="bookmarks-title">Bookmarks</h2>
        {bookmarkedLessons.length > 0 ? (
          <ul>
            {bookmarkedLessons.map((lesson) =>
              lesson ? (
                <li key={lesson.slug}>
                  <Link to={`/learn/${lesson.moduleSlug}/${lesson.slug}`}>
                    {lesson.title}
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        ) : (
          <p>No bookmarks yet.</p>
        )}
      </section>
    </div>
  );
}
