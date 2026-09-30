import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Point } from 'geojson'
import { useEffect, useMemo, useRef, useState } from 'react'
import { areaLabelColor, labelHalo } from '../../map/style.ts'
import { useTheme } from '../../theme/theme.ts'
import {
  fetchAreaNames,
  tileKey,
  tilesCovering,
  type AreaName,
} from './areaNames.ts'

/** Names show from this zoom, where estates are big enough to label. */
const MIN_ZOOM = 15
/** At most this many tiles per request, nearest the centre first. */
const MAX_TILES = 9
const DEBOUNCE_MS = 400

type Props = {
  /** Style layer to draw beneath, so places keep priority */
  beforeId?: string
}

/** Labels residential estates (sites) and industrial areas by name. */
export default function AreaNames({ beforeId }: Props) {
  const { current: map } = useMap()
  const theme = useTheme()
  const [areas, setAreas] = useState<Map<string, AreaName>>(() => new Map())
  // Tiles fetched or being fetched, so each is asked for only once
  const requested = useRef(new Set<string>())

  useEffect(() => {
    if (!map) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    function load() {
      if (!map || map.getZoom() < MIN_ZOOM) return
      const bounds = map.getBounds()
      const tiles = tilesCovering([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ])
        .filter((tile) => !requested.current.has(tileKey(tile)))
        .slice(0, MAX_TILES)
      if (tiles.length === 0) return
      for (const tile of tiles) requested.current.add(tileKey(tile))
      fetchAreaNames(tiles, controller.signal)
        .then((found) =>
          setAreas((current) => {
            const next = new Map(current)
            for (const area of found) next.set(area.id, area)
            return next
          }),
        )
        .catch(() => {
          // Try these tiles again next time the map moves
          for (const tile of tiles) requested.current.delete(tileKey(tile))
        })
    }

    function schedule() {
      clearTimeout(timer)
      timer = setTimeout(load, DEBOUNCE_MS)
    }

    schedule()
    map.on('moveend', schedule)
    return () => {
      map.off('moveend', schedule)
      clearTimeout(timer)
      controller.abort()
    }
  }, [map])

  const data = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: [...areas.values()].map((area) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: area.lngLat },
        properties: { name: area.name },
      })),
    }),
    [areas],
  )

  return (
    <Source id="area-names" type="geojson" data={data}>
      <Layer
        id="area-names"
        type="symbol"
        beforeId={beforeId}
        minzoom={MIN_ZOOM}
        layout={{
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 15, 11, 18, 13],
          'text-max-width': 7,
          'text-letter-spacing': 0.02,
        }}
        paint={{
          'text-color': areaLabelColor(theme),
          'text-halo-color': labelHalo(theme),
          'text-halo-width': 1.4,
        }}
      />
    </Source>
  )
}
