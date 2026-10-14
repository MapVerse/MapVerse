import { Marker, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { BADGE_IMAGE_PX } from '../../icons/badge.ts'
import { useMapDesign } from '../../map/designSetting.ts'
import {
  PICKED,
  badgeSkin,
  poiBadge,
  selectedPoiImage,
} from '../../map/poiStyle.ts'
import { useTheme } from '../../theme/theme.ts'
import './SelectedPoi.css'

/** Identifies the picked feature within the style's POI layers. */
export type PoiMatch = { id?: string | number; name?: string; class?: string }

type Props = {
  lngLat: [number, number]
  icon?: string
  /** The category colour, for the ripple it sends out */
  color?: string
  match: PoiMatch
  /** On its way out, shrinking back into the map's own badge */
  leaving?: boolean
}

/** How much bigger than the map's own badge the picked one grows. */
const GROWTH = 1.3

/**
 * The selected map POI's badge, filled with its colour, standing in for
 * the map's own: it jumps up out of it, bigger, with a ripple, and shrinks
 * back into it when let go. Drawn as a marker over the map, it shows at
 * once and animates smoothly.
 */
export default function SelectedPoi({
  lngLat,
  icon,
  color,
  match,
  leaving = false,
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
    if (!map || match.id === undefined) return
    const target = { source: 'openmaptiles', sourceLayer: 'poi', id: match.id }
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
  }, [ref, match.id])

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
