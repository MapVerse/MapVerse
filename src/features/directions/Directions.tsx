import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, LineString } from 'geojson'
import { useEffect, useState } from 'react'
import { formatDistance, type Place } from '../place/place.ts'
import { formatDuration, maneuverArrow } from './directions.ts'
import { useRoutes } from './useRoutes.ts'
import type { TravelMode } from './valhalla.ts'
import './Directions.css'

type Origin = { name: string; lngLat: [number, number] }

const MODES: { mode: TravelMode; label: string }[] = [
  { mode: 'auto', label: 'Araba' },
  { mode: 'pedestrian', label: 'Yürüyüş' },
  { mode: 'bicycle', label: 'Bisiklet' },
]

type Props = {
  to: Place
  /** Style layer to draw routes beneath, so labels stay readable */
  beforeId?: string
  onClose: () => void
}

export default function Directions({ to, beforeId, onClose }: Props) {
  const { current: map } = useMap()
  const [mode, setMode] = useState<TravelMode>('auto')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locating, setLocating] = useState<'pending' | 'failed' | 'done'>(() =>
    'geolocation' in navigator ? 'pending' : 'failed',
  )
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState(0)
  const { routes, status } = useRoutes(origin?.lngLat ?? null, to.lngLat, mode)
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
        setPicking(true)
      },
    )
  }, [locateAttempt])

  // While picking, the next click on the map becomes the starting point
  useEffect(() => {
    if (!picking || !map) return
    const canvas = map.getCanvas()
    canvas.style.cursor = 'crosshair'
    const onClick = (event: { lngLat: { toArray(): [number, number] } }) => {
      setPicking(false)
      setOrigin({
        name: 'Haritada seçilen nokta',
        lngLat: event.lngLat.toArray(),
      })
      setSelected(0)
    }
    map.once('click', onClick)
    return () => {
      map.off('click', onClick)
      canvas.style.cursor = ''
    }
  }, [picking, map])

  useEffect(() => {
    if (!map || !route) return
    const lngs = route.shape.map(([lng]) => lng)
    const lats = route.shape.map(([, lat]) => lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        // keep the route clear of the panel
        padding:
          window.innerWidth > 640
            ? { top: 60, right: 60, bottom: 60, left: 420 }
            : { top: 320, right: 30, bottom: 40, left: 30 },
        duration: 800,
      },
    )
  }, [map, route])

  const message = picking
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
      <section className="directions" aria-label="Yol tarifi">
        <header className="directions-header">
          <button
            type="button"
            className="directions-back"
            aria-label="Yol tarifini kapat"
            onClick={onClose}
          >
            ←
          </button>
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
                {m.label}
              </button>
            ))}
          </div>
        </header>

        <div className="directions-points">
          <div className="directions-point">
            <span className="directions-dot directions-dot-origin" />
            <span className="directions-point-name">
              {origin?.name ??
                (locating === 'pending'
                  ? 'Konum alınıyor…'
                  : 'Başlangıç noktası seç')}
            </span>
            {origin?.name !== 'Konumum' && locating !== 'pending' && (
              <button type="button" onClick={locate}>
                Konumum
              </button>
            )}
            <button type="button" onClick={() => setPicking((p) => !p)}>
              {picking ? 'Vazgeç' : 'Haritadan seç'}
            </button>
          </div>
          <div className="directions-point">
            <span className="directions-dot directions-dot-destination" />
            <span className="directions-point-name">{to.name}</span>
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
                    <strong>{formatDuration(r.seconds)}</strong>
                    <span>{formatDistance(r.meters)}</span>
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
                  <span className="directions-arrow" aria-hidden="true">
                    {maneuverArrow(step.type)}
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
          id="routes-alternate"
          type="line"
          beforeId={beforeId}
          filter={['!', ['get', 'selected']]}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': '#94a3b8', 'line-width': 5 }}
        />
        <Layer
          id="routes-casing"
          type="line"
          beforeId={beforeId}
          filter={['get', 'selected']}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': '#1d4ed8', 'line-width': 8 }}
        />
        <Layer
          id="routes-selected"
          type="line"
          beforeId={beforeId}
          filter={['get', 'selected']}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': '#3b82f6', 'line-width': 5 }}
        />
      </Source>
      {origin && (
        <Marker longitude={origin.lngLat[0]} latitude={origin.lngLat[1]}>
          <span className="route-origin" />
        </Marker>
      )}
      <Marker longitude={to.lngLat[0]} latitude={to.lngLat[1]}>
        <span className="route-destination" />
      </Marker>
    </>
  )
}
