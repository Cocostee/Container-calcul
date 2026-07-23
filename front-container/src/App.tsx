import './App.css'
import './components/ui/ui.css'

import { ProjectProvider } from './context/ProjectContext'
import { AppRouter } from './router/AppRouter'

function App() {
  return (
    <ProjectProvider>
      <AppRouter />
    </ProjectProvider>
  )
}

export default App
