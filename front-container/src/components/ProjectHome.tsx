import type { ProjectSummary } from '../types/project.types'
import { Button } from './ui/Button/Button'

interface ProjectHomeProps {
  projects: ProjectSummary[]
  isLoading: boolean
  error: string | null
  onCreate: () => void
  onImport: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

/** Initial page: project management is intentionally separate from the editor. */
export function ProjectHome({
  projects,
  isLoading,
  error,
  onCreate,
  onImport,
  onOpen,
  onDelete,
}: ProjectHomeProps) {
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
            <p className="workspace-header__eyebrow">Logistique</p>
            <h1>Plans de chargement</h1>
            <p>
              Créez un projet ou reprenez un calcul existant pour organiser les
              colis, les palettes et le conteneur.
            </p>
          </div>
        </div>
        <div className="project-home__actions">
          <Button variant="secondary" onClick={onImport}>
            Importer un fichier
          </Button>
          <Button variant="primary" onClick={onCreate}>
            Ajouter un projet
          </Button>
        </div>
      </header>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="project-home__content" aria-labelledby="projects-title">
        <div className="panel-heading">
          <div>
            <p className="panel-heading__eyebrow">Projets</p>
            <h2 id="projects-title">Vos projets enregistrés</h2>
          </div>
          <span className="panel-heading__meta">
            {projects.length} projet{projects.length > 1 ? 's' : ''}
          </span>
        </div>

        {isLoading ? <p className="muted">Chargement des projets…</p> : null}
        {!isLoading && projects.length === 0 ? (
          <div className="project-home__empty">
            <h3>Commencez un nouveau plan</h3>
            <p>
              Définissez le conteneur, chargez les colis sur les palettes, puis
              contrôlez leur placement final.
            </p>
            <Button variant="primary" onClick={onCreate}>
              Ajouter un projet
            </Button>
            <Button variant="secondary" onClick={onImport}>
              Importer un fichier
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
                    Modifié le {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                  <span className="project-card__action">Ouvrir le projet →</span>
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
        ) : null}
      </section>
    </main>
  )
}
