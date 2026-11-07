import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { useEffect, useState } from 'react'
import { currentLocale } from '../../i18n/index.ts'
import { NOMINATIM_URL } from '../../lib/endpoints.ts'
import { useMapDesign } from '../../map/designSetting.ts'
import type { OsmRef } from './place.ts'

type Outline = Polygon | MultiPolygon

type Bbox = [west: number, south: number, east: number, north: number]

/**
 * Draws the outline of a selected area, such as a city, district or park.
 * `bbox`, the area's box if known (as search results have it), sets how
 * finely the outline is drawn; without it, it is looked up first.
 */
export default function Boundary({ osm, bbox }: { osm: OsmRef; bbox?: Bbox }) {
  const [outline, setOutline] = useState<Outline | null>(null)
  const sanAndreas = useMapDesign() === 'san-andreas'

  useEffect(() => {
    const controller = new AbortController()
    fetchOutline(osm, bbox, controller.signal)
      .then(setOutline)
      .catch(() => setOutline(null))
    return () => controller.abort()
    // The box only refines the outline; a new one doesn't call for another
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

const NOMINATIM = `${NOMINATIM_URL}/lookup`

/**
 * How far, in degrees, the outline may stray from the true border: about
 * a thousandth of the area's width, so a whole country comes as a few
 * thousand points rather than megabytes, and a district still follows its
 * streets.
 */
function outlineThreshold([w, s, e, n]: Bbox): number {
  const span = Math.max(e - w, n - s)
  return Math.min(0.05, Math.max(0.0005, span / 1000))
}

async function lookup(
  osm: OsmRef,
  extra: Record<string, string>,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    osm_ids: `${osm.type}${osm.id}`,
    format: 'geojson',
    // In English, English names; in Turkish, as the browser asks
    ...(currentLocale() === 'en' && { 'accept-language': 'en' }),
    ...extra,
  })
  const res = await fetch(`${NOMINATIM}?${params}`, { signal })
  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`)
  return ((await res.json()) as FeatureCollection).features[0]
}

async function fetchOutline(
  osm: OsmRef,
  known: Bbox | undefined,
  signal: AbortSignal,
): Promise<Outline | null> {
  // Its size first, if not known: a small answer, without the outline
  const bbox =
    known ?? ((await lookup(osm, {}, signal))?.bbox?.slice(0, 4) as Bbox)
  if (!bbox) return null
  const feature = await lookup(
    osm,
    {
      polygon_geojson: '1',
      polygon_threshold: String(outlineThreshold(bbox)),
    },
    signal,
  )
  const geometry = feature?.geometry
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'
    ? geometry
    : null
}
