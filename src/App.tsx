import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { courseModules } from "./data/course";
import { ContentReviewPage } from "./pages/ContentReviewPage";
import { GlossaryPage } from "./pages/GlossaryPage";
import { HomePage } from "./pages/HomePage";
import { InstrumentPage } from "./pages/InstrumentPage";
import { InstrumentsPage } from "./pages/InstrumentsPage";
import { LearnPage } from "./pages/LearnPage";
import { LessonPage } from "./pages/LessonPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PracticePage } from "./pages/PracticePage";
import { PracticeSetupPage } from "./pages/PracticeSetupPage";
import { ProgressExportPage } from "./pages/ProgressExportPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SongLabPage } from "./pages/SongLabPage";
import { SongSketchesPage } from "./pages/SongSketchesPage";
import { SourcesPage } from "./pages/SourcesPage";

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
        <Route path="practice" element={<PracticePage />} />
        <Route path="practice/:moduleId/setup" element={<PracticeSetupPage />} />
        <Route path="practice/:moduleId" element={<PracticePage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="instruments/:instrumentId" element={<InstrumentPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="lab/song" element={<SongLabPage />} />
        <Route path="lab/song/sketches" element={<SongSketchesPage />} />
        <Route path="glossary" element={<GlossaryPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="progress/export" element={<ProgressExportPage />} />
        <Route path="plan" element={<ProjectPage />} />
        <Route path="plan/content-review" element={<ContentReviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
