import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import './SanAndreasHud.css'

/** Place labels whose name is shown on entering, smallest first. */
const ZONE_LAYERS = [
  'place-neighbourhood',
  'place-village',
  'place-town',
  'place-city',
]
const ZONE_SHOWN_MS = 3500

const time = () =>
  new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

/**
 * San Andreas' HUD over the map: the clock in the top-right corner, and the
 * name of the district in view, shown for a moment each time it changes.
 */
export default function SanAndreasHud() {
  const { current: map } = useMap()
  const [clock, setClock] = useState(time)
  const [zone, setZone] = useState<{ name: string; shown: boolean }>()

  useEffect(() => {
    const timer = setInterval(() => setClock(time()), 10_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!map) return
    let hide: ReturnType<typeof setTimeout> | undefined
    let current: string | undefined
    const update = () => {
      const layers = ZONE_LAYERS.filter((id) => map.getLayer(id))
      const center = map.project(map.getCenter())
      const nearest = (layer: string) =>
        map
          .queryRenderedFeatures({ layers: [layer] })
          .map((feature) => {
            const name =
              feature.properties['name:tr'] ??
              feature.properties['name:latin'] ??
              feature.properties.name
            const point =
              feature.geometry.type === 'Point'
                ? map.project(feature.geometry.coordinates as [number, number])
                : center
            return { name: name as string | undefined, far: center.dist(point) }
          })
          .filter((zone) => zone.name)
          .sort((a, b) => a.far - b.far)[0]
      const found = layers.map(nearest).find(Boolean)
      if (!found?.name || found.name === current) return
      current = found.name
      setZone({ name: found.name, shown: true })
      clearTimeout(hide)
      hide = setTimeout(
        () => setZone((z) => z && { ...z, shown: false }),
        ZONE_SHOWN_MS,
      )
    }
    map.on('moveend', update)
    map.once('idle', update)
    return () => {
      map.off('moveend', update)
      clearTimeout(hide)
    }
  }, [map])

  return (
    <div className="mv-sa-hud" aria-hidden="true">
      <span className="mv-sa-clock">{clock}</span>
      {zone && (
        <span key={zone.name} className="mv-sa-zone" data-shown={zone.shown}>
          {zone.name}
        </span>
      )}
    </div>
  )
}
