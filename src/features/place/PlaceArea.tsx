import { Layer, Source } from '@vis.gl/react-maplibre'
import type { MultiPolygon } from 'geojson'
import { useEffect, useId, useState } from 'react'
import { useTheme } from '../../theme/theme.ts'
import { fetchPlaceArea, type PlaceKind } from './area.ts'
import { FALLBACK_CATEGORY, categoryInfo } from './categories.ts'
import type { Place } from './place.ts'

type Props = {
  place: Place
  /** What it is, as the map has it, to look for an area of that kind */
  kind?: PlaceKind
  /** On its way out, once let go of */
  leaving?: boolean
}

/** How long the area flashes up before it settles, in ms. */
const FLASH_MS = 420

/** The style layer areas lie under: on the ground, below the buildings. */
const UNDER = 'building'

/**
 * A place's own area, when it is one (a park, a school, a stadium…):
 * tinted with its colour and edged, on the ground under the buildings.
 * It flashes up as it comes, then settles to a light tint, and fades as
 * the place is let go of. Only its paint changes, so the map draws it
 * smoothly.
 */
export default function PlaceArea({ place, kind, leaving = false }: Props) {
  const theme = useTheme()
  const id = useId()
  const [shape, setShape] = useState<MultiPolygon | null>(null)
  const [phase, setPhase] = useState<'hidden' | 'flash' | 'rest'>('hidden')
  const klass = kind?.class
  const subclass = kind?.subclass

  useEffect(() => {
    let current = true
    fetchPlaceArea(place, { class: klass, subclass })
      .then((found) => current && setShape(found))
      .catch(() => {})
    return () => {
      current = false
    }
  }, [place, klass, subclass])

  // Drawn once at nothing, then brought up: so it fades in
  useEffect(() => {
    if (!shape) return
    const frame = requestAnimationFrame(() => setPhase('flash'))
    const timer = setTimeout(() => setPhase('rest'), FLASH_MS)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [shape])

  if (!shape) return null
  const color = (categoryInfo(place.categoryKey) ?? FALLBACK_CATEGORY).color
  const shown = !leaving && phase !== 'hidden'
  const tint = theme === 'dark' ? 0.22 : 0.16
  const fill = !shown ? 0 : phase === 'flash' ? 0.38 : tint
  // Transitions first: they apply to the values set after them
  const fade = { duration: leaving ? 180 : phase === 'flash' ? 380 : 700 }

  return (
    <Source id={`place-area${id}`} type="geojson" data={shape}>
      <Layer
        id={`place-area-fill${id}`}
        type="fill"
        beforeId={UNDER}
        paint={{
          'fill-opacity-transition': fade,
          'fill-color': color,
          'fill-opacity': fill,
        }}
      />
      <Layer
        id={`place-area-edge${id}`}
        type="line"
        beforeId={UNDER}
        layout={{ 'line-join': 'round' }}
        paint={{
          'line-opacity-transition': fade,
          'line-color': color,
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 18, 3.5],
          'line-opacity': shown ? 0.9 : 0,
        }}
      />
    </Source>
  )
}
