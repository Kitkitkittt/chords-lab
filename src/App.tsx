import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { courseModules } from "./data/course";
import { AboutPage } from "./pages/AboutPage";
import { AdvancedHarmonyPage } from "./pages/AdvancedHarmonyPage";
import { ArrangerPage } from "./pages/ArrangerPage";
import { ContentReviewPage } from "./pages/ContentReviewPage";
import { CounterpointPage } from "./pages/CounterpointPage";
import { DictationPage } from "./pages/DictationPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { HomePage } from "./pages/HomePage";
import { InstrumentPage } from "./pages/InstrumentPage";
import { InstrumentsPage } from "./pages/InstrumentsPage";
import { LearnPage } from "./pages/LearnPage";
import { LessonPage } from "./pages/LessonPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlayPage } from "./pages/PlayPage";
import { PracticePage } from "./pages/PracticePage";
import { PracticeSetupPage } from "./pages/PracticeSetupPage";
import { RepertoirePage } from "./pages/RepertoirePage";
import { ProgressExportPage } from "./pages/ProgressExportPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReviewPage } from "./pages/ReviewPage";
import { RoutinesPage } from "./pages/RoutinesPage";
import { SightReadingPage } from "./pages/SightReadingPage";
import { SmartSessionPage } from "./pages/SmartSessionPage";
import { SongLabPage } from "./pages/SongLabPage";
import { SongSketchesPage } from "./pages/SongSketchesPage";
import { SourcesPage } from "./pages/SourcesPage";
import { ToolsPage } from "./pages/ToolsPage";

export function App() {
  const firstModule = courseModules[0];
  const firstLessonSlug = firstModule.lessonSlugs[0];

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route
          path="learn/start"
          element={
            <Navigate
              to={`/learn/${firstModule.slug}/${firstLessonSlug}`}
              replace
            />
          }
        />
        <Route path="learn/:moduleSlug/:lessonSlug" element={<LessonPage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="practice/smart" element={<SmartSessionPage />} />
        <Route path="practice/dictation" element={<DictationPage />} />
        <Route path="practice/sight-reading" element={<SightReadingPage />} />
        <Route path="practice/advanced-harmony" element={<AdvancedHarmonyPage />} />
        <Route path="practice/counterpoint" element={<CounterpointPage />} />
        <Route path="practice/:moduleId/setup" element={<PracticeSetupPage />} />
        <Route path="practice/:moduleId" element={<PracticePage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="instruments/:instrumentId" element={<InstrumentPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="lab/song" element={<SongLabPage />} />
        <Route path="lab/song/sketches" element={<SongSketchesPage />} />
        <Route path="lab/arrange" element={<ArrangerPage />} />
        <Route path="lab/repertoire" element={<RepertoirePage />} />
        <Route path="tools" element={<Navigate to="/tools/circle" replace />} />
        <Route path="tools/circle" element={<ToolsPage />} />
        <Route path="tools/progression" element={<ToolsPage />} />
        <Route path="tools/tuner" element={<ToolsPage />} />
        <Route path="glossary" element={<GlossaryPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="progress/export" element={<ProgressExportPage />} />
        <Route path="plan" element={<ProjectPage />} />
        <Route path="plan/content-review" element={<ContentReviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
