import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { useEffect, useState } from 'react'
import { useMapDesign } from '../../map/designSetting.ts'
import type { OsmRef } from './place.ts'

type Outline = Polygon | MultiPolygon

/** Draws the outline of a selected area, such as a city, district or park. */
export default function Boundary({ osm }: { osm: OsmRef }) {
  const [outline, setOutline] = useState<Outline | null>(null)
  const sanAndreas = useMapDesign() === 'san-andreas'

  useEffect(() => {
    const controller = new AbortController()
    fetchOutline(osm, controller.signal)
      .then(setOutline)
      .catch(() => setOutline(null))
    return () => controller.abort()
  }, [osm])

  if (!outline) return null
  return (
    <Source id="selected-area" type="geojson" data={outline}>
      {/* On San Andreas' map, a gang territory: Grove Street green */}
      {sanAndreas && (
        <Layer
          id="selected-area-fill"
          type="fill"
          paint={{ 'fill-color': '#2fa84f', 'fill-opacity': 0.35 }}
        />
      )}
      <Layer
        id="selected-area-outline"
        type="line"
        paint={
          sanAndreas
            ? { 'line-color': '#145c27', 'line-width': 2 }
            : {
                'line-color': '#e5484d',
                'line-width': 1.5,
                'line-dasharray': [3, 2],
              }
        }
      />
    </Source>
  )
}

async function fetchOutline(
  osm: OsmRef,
  signal: AbortSignal,
): Promise<Outline | null> {
  const params = new URLSearchParams({
    osm_ids: `${osm.type}${osm.id}`,
    format: 'geojson',
    polygon_geojson: '1',
    polygon_threshold: '0.0005',
  })
  const res = await fetch(
    `https://nominatim.openstreetmap.org/lookup?${params}`,
    { signal },
  )
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`)
  const { features } = (await res.json()) as FeatureCollection
  const geometry = features[0]?.geometry
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'
    ? geometry
    : null
}
