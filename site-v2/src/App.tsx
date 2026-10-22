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

        <Route element={<SiteShell />}>
          <Route index element={<HomePage />} />

          <Route path="science" element={<ScienceLayout />}>
            <Route index element={<ScienceOverview />} />
            <Route path=":slug" element={<ScienceChapterPage />} />
          </Route>

          <Route path="message-board" element={<MessageBoardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
