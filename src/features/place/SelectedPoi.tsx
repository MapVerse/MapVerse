import { Marker, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { BADGE_IMAGE_PX } from '../../icons/badge.ts'
import { Glyph } from '../../icons/Icon.tsx'
import { useMapDesign } from '../../map/designSetting.ts'
import {
  PICKED,
  badgeSkin,
  poiBadge,
  selectedPoiImage,
} from '../../map/poiStyle.ts'
import { useTheme } from '../../theme/theme.ts'
import { FALLBACK_CATEGORY, categoryInfo } from './categories.ts'
import './SelectedPoi.css'

/** Identifies the picked feature within the style's POI layers. */
export type PoiMatch = { id?: string | number; name?: string; class?: string }

type Props = {
  lngLat: [number, number]
  icon?: string
  /** The category colour, for the ripple it sends out */
  color?: string
  /** The map's own POI it stands in for, to hide that meanwhile */
  match?: PoiMatch
  /** On its way out, shrinking back into the map's own badge */
  leaving?: boolean
  /** Opened, rather than glanced at: it stands up as a pin */
  pin?: boolean
  /** The category, for the pin's glyph */
  categoryKey?: string
}

/** How tall the pin stands over its place, in px. */
export const PIN_PX = 48

/** How much bigger than the map's own badge the picked one grows. */
const GROWTH = 1.3

/**
 * The map POI looked at, standing in for the map's own badge. Glanced at,
 * its badge fills with its colour and jumps up out of the map's, bigger,
 * with a ripple; opened, it stands up from its place as a pin of its
 * colour, landing with a bounce and a ring on the ground. Either goes
 * back into the map's badge when let go. Drawn as a marker over the map
 * and moved only by transforms, it shows at once and animates smoothly.
 */
export default function SelectedPoi({
  lngLat,
  icon,
  color,
  match,
  leaving = false,
  pin = false,
  categoryKey,
}: Props) {
  const { current: ref } = useMap()
  const theme = useTheme()
  const design = useMapDesign()
  const canvas = useRef<HTMLCanvasElement>(null)
  const id = icon && selectedPoiImage(icon, badgeSkin(theme, design))
  const badge = useMemo(() => (id ? poiBadge(id) : undefined), [id])

  useEffect(() => {
    if (badge) canvas.current?.getContext('2d')?.putImageData(badge, 0, 0)
  }, [badge])

  // Hide the map's own badge while this one stands in for it. A restyle
  // (the theme or design changing) forgets it, so it is set again after one.
  useEffect(() => {
    const map = ref?.getMap()
    const id = match?.id
    if (!map || id === undefined) return
    const target = { source: 'openmaptiles', sourceLayer: 'poi', id }
    const pick = () => {
      if (!map.getSource('openmaptiles')) return
      if (map.getFeatureState(target)[PICKED]) return
      map.setFeatureState(target, { [PICKED]: true })
    }
    pick()
    map.on('styledata', pick)
    return () => {
      map.off('styledata', pick)
      if (map.getSource('openmaptiles')) map.removeFeatureState(target, PICKED)
    }
  }, [ref, match?.id])

  // San Andreas keeps to its radar blips
  if (pin && design !== 'san-andreas') {
    const info = categoryInfo(categoryKey) ?? FALLBACK_CATEGORY
    return (
      <Marker
        longitude={lngLat[0]}
        latitude={lngLat[1]}
        anchor="bottom"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      >
        <div
          className={`poi-pin${leaving ? ' is-leaving' : ''}`}
          style={
            {
              '--pin-height': `${PIN_PX}px`,
              '--poi-color': color ?? info.color,
            } as CSSProperties
          }
        >
          <span className="poi-pin-ground" />
          <span className="poi-pin-body">
            <Glyph name={info.glyph} size={20} />
          </span>
        </div>
      </Marker>
    )
  }

  if (!badge) return null
  return (
    <Marker
      longitude={lngLat[0]}
      latitude={lngLat[1]}
      anchor="bottom"
      // Its foot on the map badge's foot, so it grows up out of it
      offset={[0, BADGE_IMAGE_PX / 2]}
      style={{ zIndex: 1, pointerEvents: 'none' }}
    >
      <div
        className={`selected-poi${leaving ? ' is-leaving' : ''}`}
        style={
          {
            '--poi-size': `${BADGE_IMAGE_PX * GROWTH}px`,
            '--poi-from': 1 / GROWTH,
            '--poi-color': color ?? 'var(--mv-accent)',
          } as CSSProperties
        }
      >
        <canvas ref={canvas} width={badge.width} height={badge.height} />
      </div>
    </Marker>
  )
}
