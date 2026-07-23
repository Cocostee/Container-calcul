import type { ProjectSummary } from '../../types/project.types'
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
  return (
    <section className="sidebar-section sidebar-section--projects">
      <div className="sidebar-section__header">
        <h2>Projets</h2>
        <Button variant="primary" onClick={onNew}>
          Nouveau
        </Button>
      </div>
      {projects.length === 0 ? (
        <p className="muted" role="status">
          Aucun projet sauvegardé.
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
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </Button>
              <Button
                variant="ghost"
                className="project-list__delete"
                aria-label={`Supprimer le projet ${project.name}`}
                onClick={() => onDelete(project.id)}
              >
                <span aria-hidden="true">×</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
