import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { EditorPage } from '../pages/EditorPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/projects/:id" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
