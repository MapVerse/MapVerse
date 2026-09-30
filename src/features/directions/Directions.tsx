import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, LineString } from 'geojson'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import type { StrokeName } from '../../icons/strokes.ts'
import { useTheme, type Theme } from '../../theme/theme.ts'
import { formatDistance, type Place } from '../place/place.ts'
import { formatArrival, formatDuration, maneuverIcon } from './directions.ts'
import { useRoutes } from './useRoutes.ts'
import type { TravelMode } from './valhalla.ts'
import './Directions.css'

type Origin = { name: string; lngLat: [number, number] }
/** Which end of the route the next map click sets. */
type Target = 'origin' | 'destination'

const MODES: { mode: TravelMode; label: string; icon: StrokeName }[] = [
  { mode: 'auto', label: 'Araba', icon: 'car' },
  { mode: 'pedestrian', label: 'Yürüyüş', icon: 'walk' },
  { mode: 'bicycle', label: 'Bisiklet', icon: 'bike' },
]

// A white edge lifts routes off the light map; a dark one off the dark map
const ROUTE_COLORS: Record<
  Theme,
  { casing: string; alternate: string; selected: string }
> = {
  light: { casing: '#ffffff', alternate: '#a3b4cc', selected: '#2f7bf5' },
  dark: { casing: '#11151b', alternate: '#56657b', selected: '#4c8df6' },
}

type Props = {
  /** Where to go; when missing, the destination is picked on the map */
  to: Place | null
  /** Style layer to draw routes beneath, so labels stay readable */
  beforeId?: string
  onClose: () => void
}

export default function Directions({ to, beforeId, onClose }: Props) {
  const { current: map } = useMap()
  const panelRef = useRef<HTMLElement>(null)
  const colors = ROUTE_COLORS[useTheme()]
  const [mode, setMode] = useState<TravelMode>('auto')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locating, setLocating] = useState<'pending' | 'failed' | 'done'>(() =>
    'geolocation' in navigator ? 'pending' : 'failed',
  )
  const [destination, setDestination] = useState<Place | null>(to)
  const [picking, setPicking] = useState<Target | null>(
    to ? null : 'destination',
  )
  const [selected, setSelected] = useState(0)
  const { routes, status } = useRoutes(
    origin?.lngLat ?? null,
    destination?.lngLat ?? null,
    mode,
  )
  const route = routes[selected] ?? routes[0]

  // Bumped to ask for the user's location again
  const [locateAttempt, setLocateAttempt] = useState(0)

  function locate() {
    setLocating('pending')
    setLocateAttempt((n) => n + 1)
  }

  // Start from the user's location, as long as they allow it
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating('done')
        setOrigin({
          name: 'Konumum',
          lngLat: [coords.longitude, coords.latitude],
        })
        setSelected(0)
      },
      () => {
        setLocating('failed')
        setPicking((target) => target ?? 'origin')
      },
    )
  }, [locateAttempt])

  // While picking, the next click on the map sets that end of the route
  useEffect(() => {
    if (!picking || !map) return
    const canvas = map.getCanvas()
    canvas.style.cursor = 'crosshair'
    const onClick = (event: { lngLat: { toArray(): [number, number] } }) => {
      const lngLat = event.lngLat.toArray()
      if (picking === 'destination') {
        setDestination({
          key: `picked:${lngLat}`,
          name: 'Haritada seçilen nokta',
          lngLat,
        })
        // Without a starting point yet, ask for that next
        setPicking(!origin && locating === 'failed' ? 'origin' : null)
      } else {
        setOrigin({ name: 'Haritada seçilen nokta', lngLat })
        setPicking(null)
      }
      setSelected(0)
    }
    map.once('click', onClick)
    return () => {
      map.off('click', onClick)
      canvas.style.cursor = ''
    }
  }, [picking, map, origin, locating])

  useEffect(() => {
    if (!map || !route) return
    const lngs = route.shape.map(([lng]) => lng)
    const lats = route.shape.map(([, lat]) => lat)
    const panel = panelRef.current?.getBoundingClientRect()
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        // Keep the route clear of the panel: beside it on wide screens,
        // below it on phones
        padding:
          window.innerWidth > 640
            ? {
                top: 60,
                right: 70,
                bottom: 60,
                left: (panel?.right ?? 400) + 40,
              }
            : {
                top: (panel?.bottom ?? 320) + 30,
                right: 40,
                bottom: 50,
                left: 40,
              },
        duration: 800,
      },
    )
  }, [map, route])

  const message =
    picking === 'destination'
      ? 'Varış için haritada bir noktaya tıkla.'
      : picking === 'origin'
        ? locating === 'failed' && !origin
          ? 'Konumuna erişilemedi. Başlangıç için haritada bir noktaya tıkla.'
          : 'Başlangıç için haritada bir noktaya tıkla.'
        : status === 'loading'
          ? 'Rota hesaplanıyor…'
          : status === 'none'
            ? 'Bu iki nokta arasında rota bulunamadı.'
            : status === 'error'
              ? 'Rota şu anda hesaplanamıyor.'
              : null

  const lines: FeatureCollection<LineString, { selected: boolean }> = {
    type: 'FeatureCollection',
    features: routes.map((r) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: r.shape },
      properties: { selected: r === route },
    })),
  }

  return (
    <>
      <section ref={panelRef} className="directions" aria-label="Yol tarifi">
        <header className="directions-header">
          <button
            type="button"
            className="directions-icon-button"
            aria-label="Yol tarifini kapat"
            onClick={onClose}
          >
            <Icon name="back" size={20} />
          </button>
          <h2 className="directions-title">Yol tarifi</h2>
        </header>

        <div className="directions-modes" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="tab"
              aria-selected={m.mode === mode}
              onClick={() => {
                setMode(m.mode)
                setSelected(0)
              }}
            >
              <Icon name={m.icon} size={20} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="directions-points">
          <div className="directions-point">
            <span className="directions-dot directions-dot-origin" />
            <div className="directions-point-text">
              <span className="directions-point-label">Başlangıç</span>
              <span className="directions-point-name">
                {origin?.name ??
                  (locating === 'pending'
                    ? 'Konum alınıyor…'
                    : 'Başlangıç noktası seç')}
              </span>
            </div>
          </div>
          <div className="directions-chips">
            {origin?.name !== 'Konumum' && locating !== 'pending' && (
              <button type="button" onClick={locate}>
                <Icon name="locate" size={16} />
                Konumum
              </button>
            )}
            <button
              type="button"
              aria-label="Başlangıcı haritadan seç"
              aria-pressed={picking === 'origin'}
              onClick={() =>
                setPicking((p) => (p === 'origin' ? null : 'origin'))
              }
            >
              <Icon name={picking === 'origin' ? 'close' : 'pin'} size={16} />
              {picking === 'origin' ? 'Vazgeç' : 'Haritadan seç'}
            </button>
          </div>
          <div className="directions-point">
            <span className="directions-dot directions-dot-destination" />
            <div className="directions-point-text">
              <span className="directions-point-label">Varış</span>
              <span className="directions-point-name">
                {destination?.name ?? 'Varış noktası seç'}
              </span>
            </div>
            <div className="directions-chips directions-chips-inline">
              <button
                type="button"
                aria-label="Varışı haritadan seç"
                aria-pressed={picking === 'destination'}
                onClick={() =>
                  setPicking((p) =>
                    p === 'destination' ? null : 'destination',
                  )
                }
              >
                <Icon
                  name={picking === 'destination' ? 'close' : 'pin'}
                  size={16}
                />
                {picking === 'destination' ? 'Vazgeç' : 'Haritadan seç'}
              </button>
            </div>
          </div>
        </div>

        {message && <p className="directions-message">{message}</p>}

        {route && !picking && (
          <>
            <ul className="directions-routes" aria-label="Rotalar">
              {routes.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={r === route}
                    onClick={() => setSelected(i)}
                  >
                    <span className="directions-route-time">
                      {formatDuration(r.seconds)}
                    </span>
                    <span className="directions-route-distance">
                      {formatDistance(r.meters)}
                    </span>
                    <span className="directions-route-arrival">
                      Varış {formatArrival(r.seconds)}
                    </span>
                    {i === 0 && routes.length > 1 && (
                      <span className="directions-tag">Önerilen</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <ol className="directions-steps" aria-label="Adım adım tarif">
              {route.maneuvers.map((step, i) => (
                <li key={i}>
                  <span className="directions-step-icon">
                    <Icon name={maneuverIcon(step.type)} size={18} />
                  </span>
                  <span className="directions-instruction">
                    {step.instruction}
                  </span>
                  {step.meters > 0 && (
                    <span className="directions-step-distance">
                      {formatDistance(step.meters)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <Source id="routes" type="geojson" data={lines}>
        <Layer
          id="routes-casing"
          type="line"
          beforeId={beforeId}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.casing, 'line-width': 11 }}
        />
        <Layer
          id="routes-alternate"
          type="line"
          beforeId={beforeId}
          filter={['!', ['get', 'selected']]}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.alternate, 'line-width': 6 }}
        />
        <Layer
          id="routes-selected"
          type="line"
          beforeId={beforeId}
          filter={['get', 'selected']}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.selected, 'line-width': 7 }}
        />
      </Source>
      {origin && (
        <Marker longitude={origin.lngLat[0]} latitude={origin.lngLat[1]}>
          <span className="route-origin" />
        </Marker>
      )}
      {destination && (
        <Marker
          longitude={destination.lngLat[0]}
          latitude={destination.lngLat[1]}
        >
          <span className="route-destination" />
        </Marker>
      )}
    </>
  )
}
