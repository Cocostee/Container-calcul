import { useTranslation } from '../i18n'
import type { ProjectSummary } from '../types/project.types'
import { AppControls } from './AppControls'
import { PanelHeading } from './PanelHeading'
import { Button } from './ui/Button/Button'
import { Icon } from './ui/Icon'

interface ProjectHomeProps {
  projects: ProjectSummary[]
  isLoading: boolean
  error: string | null
  onCreate: () => void
  onImport: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

/** Page initiale : gérer ses projets est un autre métier que préparer un plan. */
export function ProjectHome({
  projects,
  isLoading,
  error,
  onCreate,
  onImport,
  onOpen,
  onDelete,
}: ProjectHomeProps) {
  const { locale, t } = useTranslation()
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })

  return (
    <main className="project-home">
      <header className="project-home__header">
        <div className="project-home__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="workspace-header__eyebrow">{t('home.eyebrow')}</p>
            <h1>{t('home.title')}</h1>
            <p>{t('home.intro')}</p>
          </div>
        </div>
        <div className="project-home__actions">
          <Button variant="secondary" icon="file-upload-outline" onClick={onImport}>
            {t('home.importFile')}
          </Button>
          <Button variant="primary" icon="plus-outline" onClick={onCreate}>
            {t('home.addProject')}
          </Button>
          <AppControls />
        </div>
      </header>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="project-home__content" aria-labelledby="projects-title">
        <PanelHeading
          icon="folder-open-outline"
          eyebrow={t('home.panelEyebrow')}
          title={t('home.panelTitle')}
          titleId="projects-title"
          meta={t('home.projectCount', { count: projects.length })}
        />

        {isLoading ? <p className="muted">{t('home.loadingProjects')}</p> : null}
        {!isLoading && projects.length === 0 ? (
          <div className="project-home__empty">
            <h3>{t('home.emptyTitle')}</h3>
            <p>{t('home.emptyIntro')}</p>
            <Button variant="primary" icon="plus-outline" onClick={onCreate}>
              {t('home.addProject')}
            </Button>
            <Button
              variant="secondary"
              icon="file-upload-outline"
              onClick={onImport}
            >
              {t('home.importFile')}
            </Button>
          </div>
        ) : null}
        {projects.length > 0 ? (
          <ul className="project-home__list">
            {projects.map((project) => (
              <li key={project.id} className="project-card">
                <Button
                  variant="ghost"
                  className="project-card__open"
                  onClick={() => onOpen(project.id)}
                >
                  <span className="project-card__name">{project.name}</span>
                  <span className="muted">
                    {t('home.modifiedOn', {
                      date: dateFormat.format(new Date(project.updated_at)),
                    })}
                  </span>
                  <span className="project-card__action">
                    {t('home.openProject')}
                    <Icon name="arrow-right-outline" size="xs" tone="inherit" />
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  className="project-list__delete"
                  aria-label={t('home.deleteProject', { name: project.name })}
                  onClick={() => onDelete(project.id)}
                >
                  <Icon name="trash-outline" size="sm" tone="inherit" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  )
}
