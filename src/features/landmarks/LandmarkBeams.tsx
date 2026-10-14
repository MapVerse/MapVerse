import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import { useEffect } from 'react'
import { RISE_ZOOM, rising } from '../../map/style.ts'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS } from './catalog.ts'
import { BEAM_BANDS, landmarkBeams } from './landmarks.ts'
import { useOnTerrain } from './useOnTerrain.ts'

const BEAMS = landmarkBeams(LANDMARKS)
const BANDS = BEAM_BANDS.length - 1
/** The two tones the beams take turns in: red, and gold */
const TONES = ['#ff7461', '#ffd95c']
/** Where the beams are, to run only while one is in view */
const SPOTS = LANDMARKS.filter(({ beams }) => beams?.length).map(
  ({ near }) => near,
)

/** How long a pulse takes to run up a beam, in milliseconds. */
const PERIOD = 2800
const DIM = 0.1
const BRIGHT = 0.8

const layerId = (tone: number, band: number) => `landmark-beam-${tone}-${band}`

/**
 * How bright a band of a beam is at a time: a pulse of light running up
 * it, the two tones taking turns.
 */
function glow(tone: number, band: number, now: number): number {
  const phase = now / PERIOD + tone / 2 - band / BANDS
  const pulse = Math.max(0, Math.cos(2 * Math.PI * phase)) ** 3
  // Fading out as it climbs
  const fade = 1 - (0.7 * band) / BANDS
  return (DIM + (BRIGHT - DIM) * pulse) * fade
}

/**
 * Beams of light up into the night sky from the landmarks that shine them,
 * with pulses of red and gold running up them. Each band of a beam is a
 * layer of its own, as a layer's opacity is what can be changed cheaply
 * every frame; the pulses stand still for those who would rather not have
 * motion, and stop where no beam is in view.
 */
export default function LandmarkBeams({ beforeId }: { beforeId?: string }) {
  const theme = useTheme()
  const { current: ref } = useMap()
  const data = useOnTerrain(BEAMS)

  useEffect(() => {
    const map = ref?.getMap()
    if (!map || theme !== 'dark') return
    const set = (at: number | null) => {
      for (let tone = 0; tone < TONES.length; tone++) {
        for (let band = 0; band < BANDS; band++) {
          const id = layerId(tone, band)
          if (!map.getLayer(id)) continue
          const opacity =
            at === null ? (DIM + BRIGHT) / 2 : glow(tone, band, at)
          map.setPaintProperty(id, 'fill-extrusion-opacity', opacity)
        }
      }
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const still = () => set(null)
      still()
      map.on('styledata', still)
      return () => {
        map.off('styledata', still)
      }
    }
    let frame = 0
    let last = 0
    const run = (now: number) => {
      frame = requestAnimationFrame(run)
      // About 20 frames a second is plenty for a pulse
      if (now - last < 50 || map.getZoom() < RISE_ZOOM) return
      const bounds = map.getBounds()
      const margin = 0.01
      const seen = SPOTS.some(
        ([lng, lat]) =>
          lng > bounds.getWest() - margin &&
          lng < bounds.getEast() + margin &&
          lat > bounds.getSouth() - margin &&
          lat < bounds.getNorth() + margin,
      )
      if (!seen) return
      last = now
      set(now)
    }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [ref, theme])

  if (theme !== 'dark') return null
  return (
    <Source id="landmark-beams" type="geojson" data={data} maxzoom={16}>
      {TONES.flatMap((color, tone) =>
        Array.from({ length: BANDS }, (_, band) => (
          <Layer
            key={layerId(tone, band)}
            id={layerId(tone, band)}
            type="fill-extrusion"
            beforeId={beforeId}
            minzoom={RISE_ZOOM}
            filter={[
              'all',
              ['==', ['get', 'tone'], tone],
              ['==', ['get', 'band'], band],
            ]}
            paint={{
              'fill-extrusion-color': color,
              'fill-extrusion-base': rising(['get', 'base']),
              'fill-extrusion-height': rising(['get', 'height']),
              'fill-extrusion-opacity': DIM,
              'fill-extrusion-vertical-gradient': false,
            }}
          />
        )),
      )}
    </Source>
  )
}
