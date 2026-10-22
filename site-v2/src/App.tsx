import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SiteShell } from './components/SiteShell'
import { HomePage } from './pages/HomePage'
import { MessageBoardPage } from './pages/MessageBoardPage'
import { ScienceChapterPage } from './pages/ScienceChapterPage'
import { ScienceLayout } from './pages/ScienceLayout'
import { ScienceOverview } from './pages/ScienceOverview'

const FigurePreviewPage = lazy(() =>
  import('./pages/FigurePreviewPage').then((module) => ({
    default: module.FigurePreviewPage,
  })),
)

const HumanTestPage = lazy(() =>
  import('./pages/HumanTestPage').then((module) => ({
    default: module.HumanTestPage,
  })),
)

const ShotPreviewPage = lazy(() =>
  import('./pages/ShotPreviewPage').then((module) => ({
    default: module.ShotPreviewPage,
  })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/figure-preview"
          element={
            <Suspense fallback={<div className="figure-preview" />}>
              <FigurePreviewPage />
            </Suspense>
          }
        />

        <Route
          path="/shot-preview"
          element={
            <Suspense fallback={<div className="figure-preview" />}>
              <ShotPreviewPage />
            </Suspense>
          }
        />

        <Route
          path="/human-test"
          element={
            <Suspense fallback={<div className="human-test" />}>
              <HumanTestPage />
            </Suspense>
          }
        />

        <Route path="/" element={<HomePage />} />

        <Route element={<SiteShell />}>
          <Route path="science" element={<ScienceLayout />}>
            <Route index element={<ScienceOverview />} />
            <Route path=":slug" element={<ScienceChapterPage />} />
          </Route>

          <Route path="message-board" element={<MessageBoardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
