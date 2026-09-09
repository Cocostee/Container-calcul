import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import type {
  GeneratedPallet,
  OptimizeContainer,
  Placement,
} from '../../types/placement.types'
import { useTranslation } from '../../i18n'
import type { IconName } from '../ui/Icon'
import {
  assignPackageColors,
  colorByPaletteType,
  packageColorKey,
} from '../../utils/colorByPaletteType'
import { buildPackageLegend } from '../../utils/packageLegend'
import { Button } from '../ui/Button/Button'
import { ColorLegend } from './ColorLegend'
import { ContainerMesh } from './ContainerMesh'
import { PackageMesh } from './PackageMesh'
import { PaletteMesh } from './PaletteMesh'
import { PalletVolumeMesh } from './PalletVolumeMesh'

// cm -> scene units (metres).
const SCALE = 0.01
const ALL_PALLETS_VALUE = '__all-pallets__'
const VOLUME_COLOR = '#f2a63b'

type ViewPreset = 'iso' | 'top' | 'face'
type DisplayMode = 'container' | 'exploded'

interface SceneProps {
  container: OptimizeContainer
  placements: Placement[]
  pallets: GeneratedPallet[]
  fallbackPallets?: Array<{ id: string; label: string; weight_kg: number }>
}

interface CameraRigProps {
  view: ViewPreset
  distance: number
  target: [number, number, number]
}

interface DisplayedPallet {
  pallet: GeneratedPallet
  placement: Placement
  index: number
}

// Replace la caméra quand on choisit un point de vue.
function CameraRig({ view, distance, target }: CameraRigProps) {
  const { camera } = useThree()

  useEffect(() => {
    const positions: Record<ViewPreset, [number, number, number]> = {
      iso: [distance, distance, distance],
      top: [0.001, distance * 1.8, 0.001],
      face: [0, target[1], distance * 1.6],
    }
    const [x, y, z] = positions[view]
    camera.position.set(x, y, z)
    camera.lookAt(target[0], target[1], target[2])
  }, [view, distance, target, camera])

  return null
}

const VIEW_KEYS: Record<ViewPreset, string> = {
  iso: 'scene.viewIso',
  top: 'scene.viewTop',
  face: 'scene.viewFace',
}

const VIEW_ICONS: Record<ViewPreset, IconName> = {
  iso: 'move-outline',
  top: 'arrow-down-outline',
  face: 'columns-outline',
}

const DISPLAY_KEYS: Record<DisplayMode, string> = {
  container: 'scene.modeContainer',
  exploded: 'scene.modeExploded',
}

const DISPLAY_ICONS: Record<DisplayMode, IconName> = {
  container: 'container-outline',
  exploded: 'layers-outline',
}

function legacyPallets(
  placements: Placement[],
  fallbackPallets: Array<{ id: string; label: string; weight_kg: number }>,
): GeneratedPallet[] {
  return placements.map((placement) => {
    const source = fallbackPallets.find((pallet) =>
      placement.palette_instance_id.startsWith(`imported-${pallet.id}-`),
    )
    const number = placement.palette_instance_id.match(/-(\d+)$/)?.[1]
    return {
      id: placement.palette_instance_id,
      label: source
        ? `${source.label}${number ? ` ${Number(number) + 1}` : ''}`
        : placement.palette_instance_id,
    length: placement.length,
    width: placement.width,
    height: placement.height,
    base_height: 0,
      weight_kg: source?.weight_kg ?? 0,
    package_count: 0,
    fill_rate_volume: 0,
    fill_rate_weight: 0,
    packages: [],
    }
  })
}

export function Scene({
  container,
  placements,
  pallets,
  fallbackPallets = [],
}: SceneProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ViewPreset>('iso')
  /*
   * On arrive sur le chargement complet : toutes les palettes, à leur place
   * dans la cale. C'est la question qu'on se pose en ouvrant le plan ; isoler
   * une palette ou l'éclater vient après.
   */
  const [displayMode, setDisplayMode] = useState<DisplayMode>('container')
  const [selectedPalletId, setSelectedPalletId] =
    useState<string>(ALL_PALLETS_VALUE)
  // Le groupe isolé par un clic sur la légende ; `null` montre tout normalement.
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)

  const allPallets = useMemo(
    () =>
      pallets.length > 0 ? pallets : legacyPallets(placements, fallbackPallets),
    [fallbackPallets, pallets, placements],
  )
  const displayedPallets = useMemo<DisplayedPallet[]>(
    () =>
      placements.flatMap((placement, index) => {
        const pallet = allPallets.find(
          (candidate) => candidate.id === placement.palette_instance_id,
        )
        return pallet ? [{ pallet, placement, index }] : []
      }),
    [allPallets, placements],
  )
  const selected = displayedPallets.find(
    ({ pallet }) => pallet.id === selectedPalletId,
  )
  const isAllPalletsView = selectedPalletId === ALL_PALLETS_VALUE
  const palletsToInspect = isAllPalletsView
    ? displayedPallets
    : selected
      ? [selected]
      : []
  const palletsWithVisibleVolumes =
    palletsToInspect.length > 0 ? palletsToInspect : displayedPallets
  const totalPackageCount = displayedPallets.reduce(
    (total, { pallet }) => total + pallet.package_count,
    0,
  )
  const hasPackageDetails = totalPackageCount > 0
  const visiblePackages = palletsToInspect.flatMap(
    ({ pallet }) => pallet.packages,
  )
  // Une seule attribution pour tout ce qui est affiché : la scène et la
  // légende doivent peindre chaque groupe de la même couleur, jamais deux
  // groupes sous la même.
  const packageColors = assignPackageColors(visiblePackages)
  const legend = buildPackageLegend(visiblePackages, packageColors)

  const length = container.length_cm * SCALE
  const width = container.width_cm * SCALE
  const height = container.height_cm * SCALE
  const maxPalletLength = Math.max(
    ...allPallets.map((pallet) => pallet.length * SCALE),
    1,
  )
  const maxPalletWidth = Math.max(
    ...allPallets.map((pallet) => pallet.width * SCALE),
    1,
  )
  const explodedColumns = Math.max(1, Math.ceil(Math.sqrt(displayedPallets.length)))
  const explodedRows = Math.max(
    1,
    Math.ceil(displayedPallets.length / explodedColumns),
  )
  const explodedWidth = explodedColumns * (maxPalletLength + 0.5)
  const explodedDepth = explodedRows * (maxPalletWidth + 0.5)
  const target: [number, number, number] =
    displayMode === 'exploded' ? [0, 0.65, 0] : [0, height / 2, 0]
  const distance =
    Math.max(
      displayMode === 'exploded' ? explodedWidth : length,
      displayMode === 'exploded' ? explodedDepth : width,
      height,
    ) * 1.9

  const displayPosition = ({
    pallet,
    placement,
    index,
  }: DisplayedPallet): [number, number, number] => {
    if (displayMode === 'container') {
      return [
        (placement.x + placement.length / 2 - container.length_cm / 2) * SCALE,
        (placement.z + placement.height / 2) * SCALE,
        (placement.y + placement.width / 2 - container.width_cm / 2) * SCALE,
      ]
    }

    const column = index % explodedColumns
    const row = Math.floor(index / explodedColumns)
    return [
      (column - (explodedColumns - 1) / 2) * (maxPalletLength + 0.5),
      (pallet.height / 2) * SCALE,
      (row - (explodedRows - 1) / 2) * (maxPalletWidth + 0.5),
    ]
  }

  return (
    <div className="scene3d">
      <ColorLegend
        entries={legend}
        selectedKey={highlightedKey}
        onToggle={(key) =>
          setHighlightedKey((current) => (current === key ? null : key))
        }
      />
      <div className="scene3d__toolbar">
        <div
          className="scene3d__views"
          role="group"
          aria-label={t('scene.viewGroup')}
        >
          {(Object.keys(VIEW_KEYS) as ViewPreset[]).map((preset) => (
            <Button
              key={preset}
              variant={view === preset ? 'primary' : 'ghost'}
              aria-pressed={view === preset}
              icon={VIEW_ICONS[preset]}
              onClick={() => setView(preset)}
            >
              {t(VIEW_KEYS[preset])}
            </Button>
          ))}
        </div>
        <div
          className="scene3d__modes"
          role="group"
          aria-label={t('scene.modeGroup')}
        >
          {(Object.keys(DISPLAY_KEYS) as DisplayMode[]).map((mode) => (
            <Button
              key={mode}
              variant={displayMode === mode ? 'primary' : 'ghost'}
              aria-pressed={displayMode === mode}
              icon={DISPLAY_ICONS[mode]}
              onClick={() => setDisplayMode(mode)}
            >
              {t(DISPLAY_KEYS[mode])}
            </Button>
          ))}
        </div>
      </div>
      {displayedPallets.length > 0 ? (
        <label className="scene3d__explore">
          <span>{t('scene.explore')}</span>
          <select
            value={selectedPalletId}
            /* Le choix de la palette et le mode d'affichage restent
               indépendants : basculer en vue éclatée d'autorité contredisait
               la vue par défaut, et surprenait au retour. */
            onChange={(event) => setSelectedPalletId(event.target.value)}
          >
            <option value="">{t('scene.choosePallet')}</option>
            <option value={ALL_PALLETS_VALUE}>
              {hasPackageDetails
                ? t('scene.allPalletsFilledWith', { count: totalPackageCount })
                : t('scene.allPalletsImported', {
                    count: displayedPallets.length,
                  })}
            </option>
            {displayedPallets.map(({ pallet }) => (
              <option key={pallet.id} value={pallet.id}>
                {t('scene.palletOption', {
                  label: pallet.label,
                  detail:
                    pallet.package_count > 0
                      ? t('scene.palletPackages', { count: pallet.package_count })
                      : t('scene.palletImported'),
                })}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selected || isAllPalletsView ? (
        <div className="scene3d__selection" role="status">
          <strong>
            {isAllPalletsView
              ? t('scene.allPalletsFilled')
              : selected?.pallet.label}
          </strong>
          {isAllPalletsView ? (
            <span>
              {t('scene.selectionAll', {
                count: displayedPallets.length,
                packages: hasPackageDetails
                  ? `${t('scene.palletPackages', { count: totalPackageCount })} · `
                  : '',
              })}
            </span>
          ) : (
            <span>
              {selected?.pallet.package_count
                ? t('scene.selectionPackages', {
                    count: selected.pallet.package_count,
                    percent: Math.round(
                      (selected.pallet.fill_rate_volume ?? 0) * 100,
                    ),
                  })
                : t('scene.importedPalletVolume')}
            </span>
          )}
          <Button
            variant="ghost"
            icon="close"
            onClick={() => setSelectedPalletId('')}
          >
            {t('scene.closeView')}
          </Button>
        </div>
      ) : null}
      <p className="scene3d__hint">{t('scene.hint')}</p>
      <Canvas
        aria-label={t('scene.ariaLabel')}
        camera={{ position: [distance, distance, distance], fov: 45 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={0.72} />
        <CameraRig view={view} distance={distance} target={target} />
        <OrbitControls target={target} makeDefault />
        <ContainerMesh
          length={length}
          width={width}
          height={height}
          opacity={displayMode === 'exploded' ? 0.12 : 0.4}
        />
        {displayedPallets.map((displayed) => {
          const { pallet, placement } = displayed
          return (
            <PaletteMesh
              key={pallet.id}
              position={displayPosition(displayed)}
              size={[
                placement.length * SCALE,
                placement.height * SCALE,
                placement.width * SCALE,
              ]}
              baseHeight={pallet.base_height * SCALE}
              color={colorByPaletteType(pallet.id)}
              label={pallet.label}
              weightKg={pallet.weight_kg}
              dimsLabel={`${Math.round(pallet.length)}×${Math.round(
                pallet.width,
              )}×${Math.round(pallet.height)} cm`}
              packageCount={pallet.package_count}
              selected={selectedPalletId === pallet.id}
              onSelect={() => setSelectedPalletId(pallet.id)}
            />
          )
        })}
        {palletsWithVisibleVolumes.map((displayed) => {
          const { pallet, placement } = displayed
          const palletPosition = displayPosition(displayed)
          return (
            <PalletVolumeMesh
              key={`volume-${pallet.id}`}
              position={palletPosition}
              size={[
                placement.length * SCALE,
                placement.height * SCALE,
                placement.width * SCALE,
              ]}
              color={VOLUME_COLOR}
              onSelect={() => setSelectedPalletId(pallet.id)}
            />
          )
        })}
        {palletsToInspect.flatMap((displayed) => {
          const { pallet } = displayed
          const palletPosition = displayPosition(displayed)
          const palletBottom =
            palletPosition[1] - (pallet.height * SCALE) / 2
          return pallet.packages.map((packagePlacement) => {
            return (
              <PackageMesh
                key={`${pallet.id}-${packagePlacement.package_id}`}
                position={[
                  palletPosition[0] - (pallet.length * SCALE) / 2 +
                    (packagePlacement.x + packagePlacement.length / 2) * SCALE,
                  palletBottom +
                    pallet.base_height * SCALE +
                    (packagePlacement.z + packagePlacement.height / 2) * SCALE,
                  palletPosition[2] - (pallet.width * SCALE) / 2 +
                    (packagePlacement.y + packagePlacement.width / 2) * SCALE,
                ]}
                size={[
                  packagePlacement.length * SCALE,
                  packagePlacement.height * SCALE,
                  packagePlacement.width * SCALE,
                ]}
                color={
                  packageColors.get(packageColorKey(packagePlacement)) ??
                  colorByPaletteType(packagePlacement.package_id)
                }
                label={packagePlacement.label ?? packagePlacement.package_id}
                dimmed={
                  highlightedKey !== null &&
                  packageColorKey(packagePlacement) !== highlightedKey
                }
              />
            )
          })
        })}
      </Canvas>
    </div>
  )
}
