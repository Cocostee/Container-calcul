import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import { useTranslation } from '../../i18n'
import type {
  GeneratedPallet,
  PackagePlacement,
} from '../../types/placement.types'
import {
  assignPackageColors,
  colorByPaletteType,
  packageColorKey,
} from '../../utils/colorByPaletteType'
import { buildPackageLegend } from '../../utils/packageLegend'
import { Button } from '../ui/Button/Button'
import { Icon } from '../ui/Icon'
import { ColorLegend } from './ColorLegend'
import { PackageMesh } from './PackageMesh'
import { PaletteMesh } from './PaletteMesh'

// Centimetres to scene units (metres).
const SCALE = 0.01
// Écart par défaut entre colis voisins, réglable par l'utilisateur.
const DEFAULT_GAP_CM = 4
const MIN_GAP_CM = 0
const MAX_GAP_CM = 20

type Vec3 = [number, number, number]

/** Une palette du plan, rattachée au conteneur qui la reçoit. */
export interface PalletWithOrigin {
  pallet: GeneratedPallet
  containerPosition: number
  containerName: string
}

interface PalletExplorerSceneProps {
  pallets: PalletWithOrigin[]
}

interface CameraRigProps {
  distance: number
  target: Vec3
}

function CameraRig({ distance, target }: CameraRigProps) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(distance, distance * 0.82, distance)
    camera.lookAt(target[0], target[1], target[2])
  }, [camera, distance, target])

  return null
}

/**
 * Les paliers d'une palette, dans l'ordre où ils se sont montés : la cote Z
 * de pose de chaque colis, arrondie pour absorber les écarts flottants, sans
 * doublon et triée du sol vers le haut.
 */
function layersOf(packages: PackagePlacement[]): number[] {
  const distinctZ = [...new Set(packages.map((item) => Math.round(item.z)))]
  distinctZ.sort((a, b) => a - b)
  return distinctZ
}

/**
 * Les cotes de pose distinctes d'un axe, triées : chacune est une rangée (ou
 * une couche pour la hauteur), et son rang sert à l'écarter de ses voisines.
 * Arrondies pour absorber les écarts flottants du calcul.
 */
function ranksOf(values: number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value)))].sort(
    (a, b) => a - b,
  )
}

/**
 * Le pas d'écartement en hauteur. L'écart demandé est un maximum : sur un
 * empilage très découpé — 28 couches de 2 cm, par exemple — l'appliquer tel
 * quel ferait une tour illisible, donc on le réduit pour que la charge ne
 * dépasse pas le double de sa hauteur. Rien ne déborde pour autant : elle
 * monte au-dessus du plateau, elle n'en sort pas.
 */
function stepAbovePallet(
  loadHeight: number,
  rankCount: number,
  gapCm: number,
): number {
  if (rankCount < 2) return 0
  return Math.min(gapCm, loadHeight / (rankCount - 1))
}

/**
 * Le pas d'écartement au sol, borné par la place restée libre sur le
 * plateau : la rangée de rang `n` s'écarte de `n` pas, donc aucune ne doit
 * dépasser son bord. Le plateau garde ainsi sa taille réelle — l'agrandir
 * pour absorber l'écart reviendrait à rapetisser les colis dessus.
 */
function stepOnPallet(
  packages: PackagePlacement[],
  ranks: number[],
  start: (item: PackagePlacement) => number,
  size: (item: PackagePlacement) => number,
  palletSize: number,
  gapCm: number,
): number {
  let step = gapCm
  for (const item of packages) {
    const rank = ranks.indexOf(Math.round(start(item)))
    if (rank < 1) continue
    const room = palletSize - (start(item) + size(item))
    step = Math.min(step, room / rank)
  }
  return Math.max(0, step)
}

interface ExplodedLayout {
  /** Le décalage de chaque colis, en centimètres, axes x / y / z des données. */
  offsets: Map<string, Vec3>
  /** La hauteur d'ensemble une fois la charge écartée, en centimètres. */
  height: number
}

/**
 * Écarte les colis d'une palette sans jamais toucher à leur taille ni à
 * celle du plateau : chaque rangée s'éloigne de la précédente d'un même pas.
 * Au sol, ce pas s'arrête au bord du plateau — rien ne se retrouve dans le
 * vide ; en hauteur, la charge s'ouvre librement, puisque monter ne fait
 * sortir de rien.
 */
function explodeLayout(
  pallet: GeneratedPallet,
  gapCm: number,
): ExplodedLayout {
  const packages = pallet.packages
  const offsets = new Map<string, Vec3>()

  if (packages.length === 0 || gapCm === 0) {
    return { offsets, height: pallet.height }
  }

  const xRanks = ranksOf(packages.map((item) => item.x))
  const yRanks = ranksOf(packages.map((item) => item.y))
  const zRanks = ranksOf(packages.map((item) => item.z))

  const stepX = stepOnPallet(
    packages,
    xRanks,
    (item) => item.x,
    (item) => item.length,
    pallet.length,
    gapCm,
  )
  const stepY = stepOnPallet(
    packages,
    yRanks,
    (item) => item.y,
    (item) => item.width,
    pallet.width,
    gapCm,
  )
  const stepZ = stepAbovePallet(
    pallet.height - pallet.base_height,
    zRanks.length,
    gapCm,
  )

  for (const item of packages) {
    offsets.set(item.package_id, [
      xRanks.indexOf(Math.round(item.x)) * stepX,
      yRanks.indexOf(Math.round(item.y)) * stepY,
      zRanks.indexOf(Math.round(item.z)) * stepZ,
    ])
  }

  return {
    offsets,
    height: pallet.height + (zRanks.length - 1) * stepZ,
  }
}

/**
 * Les palettes montées, parcourues une à une pour que chaque colis reste
 * lisible — ce que le plan de chargement ne permet pas, puisqu'il les serre
 * dans la cale. L'écart entre colis et la couche affichée se règlent au fil
 * de la page, au-dessus du hublot, qui garde ainsi toute la place pour la 3D.
 */
export function PalletExplorerScene({ pallets }: PalletExplorerSceneProps) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [gapCm, setGapCm] = useState(DEFAULT_GAP_CM)
  // La couche isolée, ou `null` pour montrer tout l'empilage.
  const [layerIndex, setLayerIndex] = useState<number | null>(null)
  // Le groupe isolé par un clic sur la légende ; `null` montre tout normalement.
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)

  // Le lot peut rétrécir (import, suppression) : on affiche la dernière
  // palette valide plutôt qu'une position qui a disparu.
  const clampedIndex = Math.min(index, Math.max(pallets.length - 1, 0))
  const current = pallets[clampedIndex] ?? null

  /*
   * Chaque palette a ses propres paliers : une couche isolée sur la
   * précédente ne correspond à rien sur la suivante. On l'ajuste pendant le
   * rendu plutôt que dans un effet, pour ne jamais peindre un état
   * transitoire incohérent (voir la doc React sur l'ajustement d'état).
   */
  const [lastPalletId, setLastPalletId] = useState(current?.pallet.id)
  if (current && current.pallet.id !== lastPalletId) {
    setLastPalletId(current.pallet.id)
    if (layerIndex !== null) setLayerIndex(null)
  }

  const layers = useMemo(
    () => (current ? layersOf(current.pallet.packages) : []),
    [current],
  )

  const layerOf = (z: number): number => layers.indexOf(Math.round(z)) + 1

  const exploded = useMemo(
    () =>
      current
        ? explodeLayout(current.pallet, gapCm)
        : { offsets: new Map<string, Vec3>(), height: 0 },
    [current, gapCm],
  )

  // Une seule attribution pour tout le lot visible : la couleur d'une
  // commande reste la même d'une palette à l'autre pendant qu'on les parcourt.
  const allPackages = useMemo(
    () => pallets.flatMap((entry) => entry.pallet.packages),
    [pallets],
  )
  const packageColors = useMemo(
    () => assignPackageColors(allPackages),
    [allPackages],
  )
  const legend = useMemo(
    () => buildPackageLegend(current?.pallet.packages ?? [], packageColors),
    [current, packageColors],
  )

  // Le cadrage suit les cotes écartées : la vue éclatée gagne en portée, la
  // caméra recule d'autant pour la garder entière.
  const layout = useMemo(() => {
    if (!current) {
      return { distance: 4, target: [0, 0.5, 0] as Vec3 }
    }
    const maxDim = Math.max(
      current.pallet.length * SCALE,
      current.pallet.width * SCALE,
      exploded.height * SCALE,
      1,
    )
    return {
      distance: maxDim * 3.2,
      target: [0, (exploded.height * SCALE) / 2, 0] as Vec3,
    }
  }, [current, exploded])

  if (!current) return null

  const { pallet } = current
  /*
   * La palette est posée sur le sol de la scène : son groupe est centré à
   * mi-hauteur (voir sa `position` plus bas), donc son bas est à zéro et la
   * face du plateau — sur laquelle reposent les colis — est à `base_height`.
   */
  const deckTopY = pallet.base_height * SCALE

  return (
    <div className="pallet-explorer">
      <div className="pallet-explorer__controls">
        <div className="pallet-explorer__row">
          <p className="pallet-explorer__total">
            <strong>{pallets.length}</strong>
            <span>{t('palletization.totalLabel')}</span>
          </p>

          <div
            className="pallet-explorer__nav"
            role="group"
            aria-label={t('palletization.choosePalletLabel')}
          >
            <Button
              variant="ghost"
              className="pallet-explorer__step"
              aria-label={t('palletization.navPrevious')}
              disabled={clampedIndex === 0}
              onClick={() => setIndex(Math.max(0, clampedIndex - 1))}
            >
              <Icon name="arrow-left-outline" />
            </Button>
            <label className="pallet-explorer__field">
              <span>{t('palletization.choosePalletLabel')}</span>
              <select
                value={clampedIndex}
                onChange={(event) => setIndex(Number(event.target.value))}
              >
                {pallets.map((entry, entryIndex) => (
                  <option key={entry.pallet.id} value={entryIndex}>
                    {t('palletization.palletSelectOption', {
                      index: entryIndex + 1,
                      total: pallets.length,
                      position: entry.containerPosition,
                    })}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="ghost"
              className="pallet-explorer__step"
              aria-label={t('palletization.navNext')}
              disabled={clampedIndex === pallets.length - 1}
              onClick={() =>
                setIndex(Math.min(pallets.length - 1, clampedIndex + 1))
              }
            >
              <Icon name="arrow-right-outline" />
            </Button>
          </div>
        </div>

        <div className="pallet-explorer__row pallet-explorer__row--settings">
          <label className="pallet-explorer__field pallet-explorer__gap">
            <span>{t('palletization.gapLabel')}</span>
            <span className="pallet-explorer__slider">
              <input
                type="range"
                min={MIN_GAP_CM}
                max={MAX_GAP_CM}
                step={1}
                value={gapCm}
                onChange={(event) => setGapCm(Number(event.target.value))}
              />
              <output>{t('palletization.gapValue', { value: gapCm })}</output>
            </span>
          </label>

          {layers.length > 1 ? (
            <label className="pallet-explorer__field">
              <span>{t('palletization.layersLabel')}</span>
              <select
                value={layerIndex ?? 'all'}
                onChange={(event) =>
                  setLayerIndex(
                    event.target.value === 'all'
                      ? null
                      : Number(event.target.value),
                  )
                }
              >
                <option value="all">{t('palletization.layerAll')}</option>
                {layers.map((_, layerOffset) => {
                  const number = layerOffset + 1
                  return (
                    <option key={number} value={number}>
                      {t('palletization.layerOption', {
                        index: number,
                        total: layers.length,
                      })}
                    </option>
                  )
                })}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="palletization-viewport">
        <ColorLegend
          entries={legend}
          selectedKey={highlightedKey}
          onToggle={(key) =>
            setHighlightedKey((value) => (value === key ? null : key))
          }
        />
        <p className="palletization-scene__hint">
          {t('scene.palletExplorerHint')}
        </p>

        <Canvas
          aria-label={t('scene.palletExplorerAriaLabel')}
          camera={{
            position: [layout.distance, layout.distance, layout.distance],
            fov: 28,
          }}
        >
          <ambientLight intensity={0.82} />
          <directionalLight position={[10, 20, 10]} intensity={0.76} />
          <CameraRig distance={layout.distance} target={layout.target} />
          <OrbitControls target={layout.target} makeDefault />
          <PaletteMesh
            position={[0, (exploded.height * SCALE) / 2, 0]}
            size={[
              pallet.length * SCALE,
              exploded.height * SCALE,
              pallet.width * SCALE,
            ]}
            baseHeight={pallet.base_height * SCALE}
            color={colorByPaletteType(pallet.id)}
            label={pallet.label}
            weightKg={pallet.weight_kg}
            dimsLabel={`${Math.round(pallet.length)}×${Math.round(
              pallet.width,
            )}×${Math.round(pallet.height)} cm`}
            packageCount={pallet.package_count}
            selected
          />
          {pallet.packages.map((packagePlacement) => {
            const dimmedByLegend =
              highlightedKey !== null &&
              packageColorKey(packagePlacement) !== highlightedKey
            const dimmedByLayer =
              layerIndex !== null &&
              layerOf(packagePlacement.z) !== layerIndex
            const offset = exploded.offsets.get(
              packagePlacement.package_id,
            ) ?? [0, 0, 0]

            return (
              <PackageMesh
                key={packagePlacement.package_id}
                position={[
                  -(pallet.length * SCALE) / 2 +
                    (packagePlacement.x +
                      packagePlacement.length / 2 +
                      offset[0]) *
                      SCALE,
                  deckTopY +
                    (packagePlacement.z +
                      packagePlacement.height / 2 +
                      offset[2]) *
                      SCALE,
                  -(pallet.width * SCALE) / 2 +
                    (packagePlacement.y +
                      packagePlacement.width / 2 +
                      offset[1]) *
                      SCALE,
                ]}
                // La taille d'origine du colis, intacte : seul son écart aux
                // voisins bouge avec le réglage, jamais sa taille.
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
                dimmed={dimmedByLegend || dimmedByLayer}
              />
            )
          })}
        </Canvas>
      </div>
    </div>
  )
}
