import { useParams } from 'react-router-dom'

import { Button } from '../components/ui/Button/Button'
import { useProjectPrint } from '../hooks/useProjectPrint'
import { useTranslation, type Locale } from '../i18n'
import type { ContainerLoad } from '../types/placement.types'
import { formatPercent } from '../utils/formatVolume'
import { groupPalletPackages } from '../utils/printPlan'

/** Un nombre dans la langue du lecteur, comme sur le reste de l'application. */
function decimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value,
  )
}

/**
 * La fiche qu'on tend au cariste : une page à elle seule, sans le rail ni la
 * 3D, pensée pour l'impression (ou l'enregistrement en PDF par le navigateur,
 * qui sait déjà le faire — pas besoin d'une bibliothèque de plus pour ça).
 *
 * S'ouvre dans son propre onglet, chargée par elle-même : l'état de
 * l'assistant reste intact pendant qu'on imprime.
 */
export function PrintPlanPage() {
  const { t, locale } = useTranslation()
  const { projectId } = useParams()
  const { project, loading, error } = useProjectPrint(projectId)
  const result = project?.last_result ?? null
  const generatedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return (
    <main className="print-plan">
      <div className="print-plan__toolbar">
        <Button
          variant="ghost"
          icon="arrow-left-outline"
          onClick={() => window.close()}
        >
          {t('print.close')}
        </Button>
        {result ? (
          <Button
            variant="primary"
            icon="file-download-outline"
            onClick={() => window.print()}
          >
            {t('print.action')}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="print-plan__status" role="status">
          {t('common.loading')}
        </p>
      ) : error ? (
        <p className="print-plan__status" role="alert">
          {error}
        </p>
      ) : !project ? (
        <p className="print-plan__status" role="alert">
          {t('print.notFound')}
        </p>
      ) : !result ? (
        <p className="print-plan__status" role="alert">
          {t('print.noResult')}
        </p>
      ) : (
        <article className="print-plan__sheet">
          <header className="print-plan__header">
            <h1>{project.name}</h1>
            <p className="print-plan__generated">
              {t('print.generatedAt', { date: generatedAt })}
            </p>
            <dl className="print-plan__summary">
              <div>
                <dt>{t('print.containersLabel')}</dt>
                <dd>{result.containers.length}</dd>
              </div>
              <div>
                <dt>{t('print.volumeLabel')}</dt>
                <dd>{formatPercent(result.fill_rate_volume)}</dd>
              </div>
              <div>
                <dt>{t('print.weightLabel')}</dt>
                <dd>{formatPercent(result.fill_rate_weight)}</dd>
              </div>
              {result.unplaced_package_count > 0 ? (
                <div className="print-plan__summary-alert">
                  <dt>{t('print.unplacedLabel')}</dt>
                  <dd>{result.unplaced_package_count}</dd>
                </div>
              ) : null}
            </dl>
          </header>

          {result.containers.map((container) => (
            <PrintContainer
              key={container.container_id ?? container.position}
              container={container}
              locale={locale}
            />
          ))}
        </article>
      )}
    </main>
  )
}

interface PrintContainerProps {
  container: ContainerLoad
  locale: Locale
}

function PrintContainer({ container, locale }: PrintContainerProps) {
  const { t } = useTranslation()

  return (
    <section className="print-plan__container">
      <h2>{container.name}</h2>
      <p className="print-plan__container-meta">
        {decimal(container.container.length_cm, locale)} ×{' '}
        {decimal(container.container.width_cm, locale)} ×{' '}
        {decimal(container.container.height_cm, locale)} {t('units.cm')}
        {' · '}
        {t('print.volumeLabel')} {formatPercent(container.fill_rate_volume)}
        {' · '}
        {t('print.weightLabel')} {formatPercent(container.fill_rate_weight)}
        {' · '}
        {decimal(container.used_weight, locale)} {t('units.kg')}
      </p>

      {container.pallets.length > 0 ? (
        container.pallets.map((pallet) => {
          const groups = groupPalletPackages(pallet.packages)
          return (
            <table key={pallet.id} className="print-plan__table">
              <caption>
                <strong>{pallet.label}</strong>
                {' — '}
                {t('print.palletCaption', {
                  count: pallet.package_count,
                  fill: formatPercent(pallet.fill_rate_volume),
                  weight: decimal(pallet.weight_kg, locale),
                })}
              </caption>
              <thead>
                <tr>
                  <th>{t('print.columnPackage')}</th>
                  <th>{t('print.columnDimensions')}</th>
                  <th>{t('print.columnQuantity')}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key}>
                    <td>{group.label}</td>
                    <td>
                      {decimal(group.length, locale)} ×{' '}
                      {decimal(group.width, locale)} ×{' '}
                      {decimal(group.height, locale)} {t('units.cm')}
                    </td>
                    <td>{decimal(group.count, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        })
      ) : (
        <table className="print-plan__table">
          <caption>{t('print.assembledCaption')}</caption>
          <thead>
            <tr>
              <th>{t('print.columnLoad')}</th>
              <th>{t('print.columnDimensions')}</th>
            </tr>
          </thead>
          <tbody>
            {container.placements.map((placement, index) => (
              <tr key={placement.palette_instance_id}>
                <td>
                  {t('print.loadNumber', { position: index + 1 })}
                </td>
                <td>
                  {decimal(placement.length, locale)} ×{' '}
                  {decimal(placement.width, locale)} ×{' '}
                  {decimal(placement.height, locale)} {t('units.cm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
