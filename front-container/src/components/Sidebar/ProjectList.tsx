import { useTranslation } from '../../i18n'
import type { ProjectSummary } from '../../types/project.types'
import { Icon } from '../ui/Icon'
import { Button } from '../ui/Button/Button'

interface ProjectListProps {
  projects: ProjectSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export function ProjectList({
  projects,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: ProjectListProps) {
  const { locale, t } = useTranslation()
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })

  return (
    <section className="sidebar-section sidebar-section--projects">
      <div className="sidebar-section__header">
        <h2>{t('home.railTitle')}</h2>
        <Button variant="primary" icon="plus-outline" onClick={onNew}>
          {t('home.railNew')}
        </Button>
      </div>
      {projects.length === 0 ? (
        <p className="muted" role="status">
          {t('home.railEmpty')}
        </p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li
              key={project.id}
              className={
                project.id === activeId
                  ? 'project-list__item project-list__item--active'
                  : 'project-list__item'
              }
            >
              <Button
                variant="ghost"
                className="project-list__select"
                aria-pressed={project.id === activeId}
                onClick={() => onSelect(project.id)}
              >
                <span className="project-list__name">{project.name}</span>
                <span className="muted">
                  {dateFormat.format(new Date(project.updated_at))}
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
      )}
    </section>
  )
}
