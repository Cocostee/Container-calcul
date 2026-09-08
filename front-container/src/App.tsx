// L'ordre compte : les primitives (ui.css) avant la mise en page (App.css),
// pour que les pages puissent ajuster les composants à spécificité égale.
import './components/ui/ui.css'
import './App.css'

import { ProjectProvider } from './context/ProjectContext'
import { I18nProvider } from './i18n'
import { AppRouter } from './router/AppRouter'
import { AppThemeProvider } from './theme'

function App() {
  return (
    <AppThemeProvider>
      <I18nProvider>
        <ProjectProvider>
          <AppRouter />
        </ProjectProvider>
      </I18nProvider>
    </AppThemeProvider>
  )
}

export default App
