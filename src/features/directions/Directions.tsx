import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, LineString } from 'geojson'
import type { ExpressionSpecification, PaddingOptions } from 'maplibre-gl'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { Icon } from '../../icons/Icon.tsx'
import type { StrokeName } from '../../icons/strokes.ts'
import { useMapDesign } from '../../map/designSetting.ts'
import { RISE_ZOOM, rising } from '../../map/style.ts'
import { useTheme, type Theme } from '../../theme/theme.ts'
import { LANDMARKS } from '../landmarks/catalog.ts'
import { routesOnDecks } from '../landmarks/decks.ts'
import { useOnTerrain } from '../landmarks/useOnTerrain.ts'
import CategoryBadge from '../place/CategoryBadge.tsx'
import { distanceMeters, formatDistance, type Place } from '../place/place.ts'
import { reverseGeocode, type SearchResult } from '../search/photon.ts'
import { MIN_QUERY_LENGTH, usePlaceSearch } from '../search/usePlaceSearch.ts'
import {
  formatArrival,
  formatDuration,
  maneuverIcon,
  routeLabels,
  routeVia,
} from './directions.ts'
import { useRoutes } from './useRoutes.ts'
import type { TravelMode } from './valhalla.ts'
import './Directions.css'

/** One end of a route. */
type End = {
  name: string
  lngLat: [number, number]
  categoryKey?: string
  /** The user's own location */
  mine?: boolean
}
/** Which end of the route. */
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

// San Andreas: an objective-yellow route edged in black, by day and night
const SAN_ANDREAS_ROUTE = {
  casing: '#000000',
  alternate: '#8c8c8c',
  selected: '#ffd83a',
}

/** From this zoom the landmarks, bridges' decks among them, are drawn. */
const DECKS_ZOOM = RISE_ZOOM

/** Routes on the ground, but not along a deck once the deck is drawn. */
const ON_GROUND: ExpressionSpecification = [
  'step',
  ['zoom'],
  1,
  DECKS_ZOOM,
  ['case', ['get', 'onDeck'], 0, 1],
]

/**
 * The picked route drawn as far as `progress` along it (0 to 1), the rest
 * of it not yet: it is drawn in from its start when it comes.
 */
function drawnTo(color: string, progress: number): ExpressionSpecification {
  const stops =
    progress >= 1
      ? [0, color, 1, color]
      : [
          0,
          color,
          Math.max(progress, 0.0001),
          color,
          Math.min(1, progress + 0.0005),
          'rgba(0, 0, 0, 0)',
        ]
  return [
    'interpolate',
    ['linear'],
    ['line-progress'],
    ...stops,
  ] as ExpressionSpecification
}

/** How long a route takes to be drawn in, in ms. */
const DRAW_MS = 900

const canLocate = 'geolocation' in navigator

/** Whether the panel splits into a top card and a bottom sheet, as on a phone. */
const isPhone = () => window.matchMedia('(max-width: 640px)').matches

/** How tall the bottom sheet stands when only its routes show, in px. */
const PEEK_PX = 188

function whereAmI(): Promise<[number, number]> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.longitude, coords.latitude]),
      reject,
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    ),
  )
}

/** A short name for a picked point: its address, up to the district. */
const shortAddress = (address: string) =>
  address.split(', ').slice(0, 2).join(', ')

type Suggestion =
  { kind: 'locate' } | { kind: 'map' } | { kind: 'place'; place: SearchResult }

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Props = {
  /** Where to go; when missing, the destination is asked for */
  to: Place | null
  /** Style layer to draw routes beneath, so labels stay readable */
  beforeId?: string
  onClose: () => void
  /** On its way out, once closed */
  leaving?: boolean
}

/**
 * Directions: a card to set both ends of a route (searched for, the user's
 * location, or picked on the map) and how to travel, and the routes found,
 * each with its turns. On a wide screen it all stands in a column beside
 * the map; on a phone the card stays at the top and the routes come up in
 * a sheet from the bottom, pulled up for the turns.
 */
export default function Directions({
  to,
  beforeId,
  onClose,
  leaving = false,
}: Props) {
  const { current: map } = useMap()
  const plannerRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const originInput = useRef<HTMLInputElement>(null)
  const destinationInput = useRef<HTMLInputElement>(null)
  const sheetPull = useRef<{ from: number; by: number } | null>(null)
  // How many times each end has been set
  const changes = useRef<Record<Target, number>>({ origin: 0, destination: 0 })
  const listId = useId()
  const theme = useTheme()
  const colors =
    useMapDesign() === 'san-andreas' ? SAN_ANDREAS_ROUTE : ROUTE_COLORS[theme]

  const [mode, setMode] = useState<TravelMode>('auto')
  const [origin, setOrigin] = useState<End | null>(null)
  const [destination, setDestination] = useState<End | null>(
    to && { name: to.name, lngLat: to.lngLat, categoryKey: to.categoryKey },
  )
  // Which end the user's location is being found for
  const [locating, setLocating] = useState<Target | null>(
    canLocate ? 'origin' : null,
  )
  const [notice, setNotice] = useState<string | null>(null)
  // The end being typed in, and what has been typed
  const [editing, setEditing] = useState<Target | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  // The end the next click on the map, or the pin's place, sets
  const [picking, setPicking] = useState<Target | null>(null)
  const [selected, setSelected] = useState(0)
  const [step, setStep] = useState<number | null>(null)
  // On a phone, whether the sheet is pulled up to show the turns
  const [expanded, setExpanded] = useState(false)

  const { routes, status } = useRoutes(
    origin?.lngLat ?? null,
    destination?.lngLat ?? null,
    mode,
  )
  const route = routes[selected] ?? routes[0]
  const labels = routeLabels(routes)
  const search = usePlaceSearch(editing ? query : '')

  const endOf = (target: Target) => (target === 'origin' ? origin : destination)

  function setEnd(target: Target, end: End | null) {
    // Whatever was set last wins over a location still being found
    changes.current[target]++
    if (target === 'origin') setOrigin(end)
    else setDestination(end)
    setSelected(0)
    setStep(null)
    setExpanded(false)
  }

  /** Finds the user's location for an end, unless it is set otherwise first. */
  function findMe(target: Target) {
    const change = changes.current[target]
    const current = () => changes.current[target] === change
    whereAmI()
      .then((lngLat) => {
        if (current()) setEnd(target, { name: 'Konumum', lngLat, mine: true })
      })
      .catch(() => current() && setNotice('Konumuna erişilemedi.'))
      .finally(() => setLocating((t) => (t === target ? null : t)))
  }

  function locate(target: Target) {
    setLocating(target)
    setNotice(null)
    findMe(target)
  }

  /** Sets an end to a point picked on the map, named by its address. */
  function picked(target: Target, lngLat: [number, number]) {
    setEnd(target, { name: 'Haritada seçilen nokta', lngLat })
    setPicking(null)
    const rename = (end: End | null, address: string) =>
      end && end.lngLat === lngLat ? { ...end, name: address } : end
    reverseGeocode(lngLat)
      .then((address) => {
        if (!address) return
        const name = shortAddress(address)
        if (target === 'origin') setOrigin((end) => rename(end, name))
        else setDestination((end) => rename(end, name))
      })
      .catch(() => {})
  }

  // Start from the user's location, as long as they allow it; with nowhere
  // to go yet, ask for that first
  useEffect(() => {
    if (canLocate) findMe('origin')
    if (!to) destinationInput.current?.focus()
    // Only as it opens
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape steps back out of picking a point, or else closes directions
  // (a field being typed in takes its own Escape first)
  useEffect(() => {
    if (leaving) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (picking) setPicking(null)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [leaving, picking, onClose])

  // While picking, the next click on the map sets that end of the route
  useEffect(() => {
    if (!picking || !map) return
    const canvas = map.getCanvas()
    canvas.style.cursor = 'crosshair'
    const onClick = (event: { lngLat: { toArray(): [number, number] } }) =>
      picked(picking, event.lngLat.toArray())
    map.once('click', onClick)
    return () => {
      map.off('click', onClick)
      canvas.style.cursor = ''
    }
  }, [picking, map]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Room to leave round the route: beside the column, or between the
   *  card and the sheet on a phone. */
  function padding(): Required<PaddingOptions> {
    const frame = map?.getContainer().getBoundingClientRect()
    const planner = plannerRef.current?.getBoundingClientRect()
    if (!frame || !planner) return { top: 60, right: 60, bottom: 60, left: 60 }
    if (!isPhone()) {
      const column = resultsRef.current?.getBoundingClientRect() ?? planner
      return {
        top: 60,
        right: 70,
        bottom: 60,
        left: Math.max(planner.right, column.right) - frame.left + 40,
      }
    }
    return {
      top: planner.bottom - frame.top + 24,
      right: 32,
      bottom: PEEK_PX + 24,
      left: 32,
    }
  }

  /** Moves the map to show the whole of the picked route. */
  function fitRoute() {
    if (!map || !route) return
    const lngs = route.shape.map(([lng]) => lng)
    const lats = route.shape.map(([, lat]) => lat)
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: padding(), duration: 800 },
    )
  }

  // Fit each route as it comes, or is picked
  useEffect(fitRoute, [map, route]) // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the picked route in from its start
  useEffect(() => {
    const style = map?.getMap()
    if (!style || !route) return
    const draw = (progress: number) => {
      if (!style.getLayer('routes-selected')) return
      style.setPaintProperty(
        'routes-selected',
        'line-gradient',
        drawnTo(colors.selected, progress),
      )
    }
    if (reducedMotion()) {
      draw(1)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      // A frame may be stamped a little before the effect ran
      const t = Math.min(1, Math.max(0, now - start) / DRAW_MS)
      draw(1 - (1 - t) ** 3)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      draw(1)
    }
  }, [map, route, colors.selected])

  function focusStep(i: number) {
    const at = route?.shape[route.maneuvers[i]?.at]
    if (!map || !at) return
    setStep(i)
    if (isPhone()) setExpanded(false)
    // Into the middle of what the panels leave free (as an offset: padding
    // given here would stay on the map after)
    const room = padding()
    map.easeTo({
      center: at,
      zoom: Math.max(map.getZoom(), 16.5),
      offset: [(room.left - room.right) / 2, (room.top - room.bottom) / 2],
      duration: 700,
    })
  }

  /** Back from a turn to the whole route. */
  function overview() {
    setStep(null)
    fitRoute()
  }

  function swap() {
    changes.current.origin++
    changes.current.destination++
    setOrigin(destination)
    setDestination(origin)
    setSelected(0)
    setStep(null)
  }

  // What to offer under the end being typed in
  const suggestions: Suggestion[] = editing
    ? [
        ...(canLocate ? [{ kind: 'locate' } as const] : []),
        { kind: 'map' } as const,
        ...search.results.map((place) => ({ kind: 'place', place }) as const),
      ]
    : []
  const typed = query.trim().length >= MIN_QUERY_LENGTH

  function choose(suggestion: Suggestion) {
    const target = editing
    if (!target) return
    setEditing(null)
    ;(target === 'origin' ? originInput : destinationInput).current?.blur()
    if (suggestion.kind === 'locate') locate(target)
    else if (suggestion.kind === 'map') setPicking(target)
    else {
      const { name, lngLat, categoryKey } = suggestion.place
      setEnd(target, { name, lngLat, categoryKey })
    }
  }

  function onFieldKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && suggestions.length > 0) {
      event.preventDefault()
      const places = suggestions.filter((s) => s.kind === 'place')
      const pick = suggestions[active] ?? (typed ? places[0] : undefined)
      if (pick) choose(pick)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  function field(target: Target) {
    const end = endOf(target)
    const isEditing = editing === target
    return (
      <label className={`directions-field${isEditing ? ' is-editing' : ''}`}>
        <span className={`directions-dot directions-dot-${target}`} />
        <input
          ref={target === 'origin' ? originInput : destinationInput}
          type="text"
          role="combobox"
          aria-label={target === 'origin' ? 'Başlangıç' : 'Varış'}
          aria-expanded={isEditing}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={
            locating === target
              ? 'Konum alınıyor…'
              : target === 'origin'
                ? 'Nereden?'
                : 'Nereye?'
          }
          value={isEditing ? query : (end?.name ?? '')}
          onFocus={(event) => {
            setEditing(target)
            setPicking(null)
            setQuery(end && !end.mine ? end.name : '')
            setActive(-1)
            const input = event.currentTarget
            requestAnimationFrame(() => input.select())
          }}
          onBlur={() => setEditing((t) => (t === target ? null : t))}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(-1)
          }}
          onKeyDown={onFieldKey}
        />
        {end?.mine && !isEditing && <Icon name="locate" size={16} />}
      </label>
    )
  }

  // On a phone, pull the sheet up for the turns or down for just the routes
  function onSheetDown(event: PointerEvent<HTMLElement>) {
    if (!isPhone()) return
    sheetPull.current = { from: event.clientY, by: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onSheetMove(event: PointerEvent<HTMLElement>) {
    if (sheetPull.current) {
      sheetPull.current.by = event.clientY - sheetPull.current.from
    }
  }

  function onSheetUp() {
    const pulled = sheetPull.current
    sheetPull.current = null
    if (!pulled) return
    if (pulled.by < -24) setExpanded(true)
    else if (pulled.by > 24) setExpanded(false)
    else setExpanded((e) => !e)
  }

  const message =
    status === 'none'
      ? 'Bu iki nokta arasında rota bulunamadı.'
      : status === 'error'
        ? 'Rota şu anda hesaplanamıyor.'
        : null
  const showResults = !editing && (status === 'loading' || !!route || !!message)

  // Along a bridge, routes run on its deck rather than the water below
  const { ground, decks } = useMemo(() => {
    const lines: FeatureCollection<LineString, { selected: boolean }> = {
      type: 'FeatureCollection',
      features: routes.map((r) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: r.shape },
        properties: { selected: r === route },
      })),
    }
    return routesOnDecks(lines, LANDMARKS)
  }, [routes, route])
  const raised = useOnTerrain(decks)
  const center = map?.getCenter().toArray()
  const focused =
    step !== null && route ? route.shape[route.maneuvers[step]?.at] : undefined

  return (
    <>
      <div
        className={`directions${leaving ? ' is-leaving' : ''}${
          picking ? ' is-picking' : ''
        }`}
        inert={leaving || undefined}
      >
        <section
          ref={plannerRef}
          className="directions-planner mv-glass"
          aria-label="Yol tarifi"
        >
          <div className="directions-top">
            <button
              type="button"
              className="directions-icon-button"
              aria-label="Yol tarifini kapat"
              onClick={onClose}
            >
              <Icon name="back" size={20} />
            </button>
            <div
              className="directions-modes"
              role="tablist"
              aria-label="Nasıl gidilecek"
              style={
                {
                  '--mode': MODES.findIndex((m) => m.mode === mode),
                } as CSSProperties
              }
            >
              {MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  role="tab"
                  aria-selected={m.mode === mode}
                  onClick={() => {
                    setMode(m.mode)
                    setSelected(0)
                    setStep(null)
                  }}
                >
                  <Icon name={m.icon} size={19} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="directions-ends">
            <div className="directions-fields">
              {field('origin')}
              {field('destination')}
            </div>
            <button
              type="button"
              className="directions-swap"
              aria-label="Başlangıç ile varışı değiştir"
              title="Yer değiştir"
              disabled={!origin && !destination}
              onClick={swap}
            >
              <Icon name="swap" size={20} />
            </button>
          </div>
          {notice && <p className="directions-notice">{notice}</p>}
        </section>

        {editing && (
          <section
            className="directions-suggestions mv-glass"
            aria-label="Öneriler"
            // Keep focus in the field, so a click on a suggestion lands
            onMouseDown={(event) => event.preventDefault()}
          >
            <ul id={listId} role="listbox">
              {suggestions.map((suggestion, i) => (
                <li
                  key={
                    suggestion.kind === 'place'
                      ? `${suggestion.place.key}-${i}`
                      : suggestion.kind
                  }
                  role="option"
                  aria-selected={i === active}
                  style={{ '--row': Math.min(i, 8) } as CSSProperties}
                  onClick={() => choose(suggestion)}
                >
                  {suggestion.kind === 'locate' ? (
                    <>
                      <span className="directions-suggestion-icon is-accent">
                        <Icon name="locate" size={18} />
                      </span>
                      <span className="directions-suggestion-text">
                        <strong>Konumum</strong>
                        <small>Bulunduğun yer</small>
                      </span>
                    </>
                  ) : suggestion.kind === 'map' ? (
                    <>
                      <span className="directions-suggestion-icon">
                        <Icon name="pin" size={18} />
                      </span>
                      <span className="directions-suggestion-text">
                        <strong>Haritadan seç</strong>
                        <small>Haritada bir noktaya dokun</small>
                      </span>
                    </>
                  ) : (
                    <>
                      <CategoryBadge
                        categoryKey={suggestion.place.categoryKey}
                        size={34}
                      />
                      <span className="directions-suggestion-text">
                        <strong>{suggestion.place.name}</strong>
                        {suggestion.place.detail && (
                          <small>{suggestion.place.detail}</small>
                        )}
                      </span>
                      {center && (
                        <span className="directions-suggestion-distance">
                          {formatDistance(
                            distanceMeters(center, suggestion.place.lngLat),
                          )}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {typed && search.status === 'loading' && (
              <div className="directions-searching" role="status">
                <span className="directions-skeleton" />
                <span className="directions-skeleton is-short" />
              </div>
            )}
            {typed && search.status === 'done' && !search.results.length && (
              <p className="directions-message">Sonuç bulunamadı.</p>
            )}
            {typed && search.status === 'error' && (
              <p className="directions-message">Arama şu anda yapılamıyor.</p>
            )}
          </section>
        )}

        {showResults && (
          <section
            ref={resultsRef}
            className={`directions-results mv-glass${
              expanded ? ' is-expanded' : ''
            }${step !== null ? ' is-stepping' : ''}`}
            aria-label="Rotalar"
          >
            <button
              type="button"
              className="directions-grabber"
              aria-label={expanded ? 'Adımları gizle' : 'Adımları göster'}
              aria-expanded={expanded}
              onPointerDown={onSheetDown}
              onPointerMove={onSheetMove}
              onPointerUp={onSheetUp}
              onPointerCancel={() => (sheetPull.current = null)}
            />
            {status === 'loading' && (
              <div className="directions-loading" role="status">
                <span className="directions-skeleton-hint">
                  Rota hesaplanıyor…
                </span>
                {[0, 1].map((k) => (
                  <div key={k} className="directions-route-skeleton">
                    <span className="directions-skeleton is-big" />
                    <span className="directions-skeleton" />
                  </div>
                ))}
              </div>
            )}
            {message && (
              <p className="directions-message is-problem">
                <Icon name="info" size={18} />
                {message}
              </p>
            )}
            {route && step !== null && route.maneuvers[step] && (
              <div className="directions-stepper" aria-label="Adım">
                <button
                  type="button"
                  className="directions-icon-button"
                  aria-label="Önceki adım"
                  disabled={step === 0}
                  onClick={() => focusStep(step - 1)}
                >
                  <Icon name="chevronLeft" size={20} />
                </button>
                <div key={step} className="directions-stepper-turn">
                  <span className="directions-step-icon">
                    <Icon
                      name={maneuverIcon(route.maneuvers[step].type)}
                      size={20}
                    />
                  </span>
                  <span className="directions-stepper-text">
                    <strong>{route.maneuvers[step].instruction}</strong>
                    <small>
                      {step + 1}/{route.maneuvers.length}. adım
                      {route.maneuvers[step].meters > 0 &&
                        ` · ${formatDistance(route.maneuvers[step].meters)}`}
                    </small>
                  </span>
                </div>
                <button
                  type="button"
                  className="directions-icon-button"
                  aria-label="Sonraki adım"
                  disabled={step === route.maneuvers.length - 1}
                  onClick={() => focusStep(step + 1)}
                >
                  <Icon name="chevronRight" size={20} />
                </button>
                <button
                  type="button"
                  className="directions-overview"
                  onClick={overview}
                >
                  <Icon name="route" size={16} />
                  Tüm rota
                </button>
              </div>
            )}
            {route && (
              <>
                <ul className="directions-routes" aria-label="Rotalar">
                  {routes.map((r, i) => {
                    const via = routeVia(r)
                    return (
                      <li key={i} style={{ '--row': i } as CSSProperties}>
                        <button
                          type="button"
                          aria-pressed={r === route}
                          onClick={() => {
                            // The one already picked, shown whole again
                            if (r === route) return overview()
                            setSelected(i)
                            setStep(null)
                          }}
                        >
                          <span className="directions-route-head">
                            <span className="directions-route-time">
                              {formatDuration(r.seconds)}
                            </span>
                            {labels[i] && (
                              <span className="directions-tag">
                                {labels[i]}
                              </span>
                            )}
                          </span>
                          <span className="directions-route-meta">
                            {formatDistance(r.meters)} · Varış{' '}
                            {formatArrival(r.seconds)}
                          </span>
                          {via && (
                            <span className="directions-route-via">
                              {via} üzerinden
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <h3 className="directions-steps-title">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((e) => !e)}
                  >
                    Adım adım tarif
                    <span>{route.maneuvers.length} adım</span>
                    <Icon name="chevronDown" size={16} />
                  </button>
                </h3>
                <ol className="directions-steps" aria-label="Adım adım tarif">
                  {route.maneuvers.map((m, i) => (
                    <li
                      key={i}
                      style={{ '--row': Math.min(i, 10) } as CSSProperties}
                    >
                      <button
                        type="button"
                        aria-current={i === step || undefined}
                        onClick={() => focusStep(i)}
                      >
                        <span className="directions-step-icon">
                          <Icon name={maneuverIcon(m.type)} size={18} />
                        </span>
                        <span className="directions-instruction">
                          {m.instruction}
                        </span>
                        {m.meters > 0 && (
                          <span className="directions-step-distance">
                            {formatDistance(m.meters)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}
      </div>

      {picking && (
        <div className="directions-picking" role="status">
          {/* On a phone, the map moves under a pin in its middle */}
          <span className="directions-picking-pin" aria-hidden="true" />
          <div className="directions-picking-bar mv-glass">
            <span className="directions-picking-text">
              <strong>
                {picking === 'origin'
                  ? 'Başlangıç noktasını seç'
                  : 'Varış noktasını seç'}
              </strong>
              <small>
                <span className="on-wide">Haritada bir yere tıkla</span>
                <span className="on-phone">
                  Haritayı iğnenin altına kaydır ya da bir yere dokun
                </span>
              </small>
            </span>
            <div className="directions-picking-actions">
              <button type="button" onClick={() => setPicking(null)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="is-primary on-phone"
                onClick={() => {
                  const at = map?.getCenter().toArray()
                  if (at) picked(picking, at)
                }}
              >
                Bu noktayı seç
              </button>
            </div>
          </div>
        </div>
      )}

      <Source id="routes" type="geojson" data={ground} lineMetrics>
        <Layer
          id="routes-casing"
          type="line"
          beforeId={beforeId}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': colors.casing,
            'line-width': 11,
            'line-opacity': ON_GROUND,
          }}
        />
        <Layer
          id="routes-alternate"
          type="line"
          beforeId={beforeId}
          filter={['!', ['get', 'selected']]}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': colors.alternate,
            'line-width': 6,
            'line-opacity': ON_GROUND,
          }}
        />
        <Layer
          id="routes-selected"
          type="line"
          beforeId={beforeId}
          filter={['get', 'selected']}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-gradient': drawnTo(colors.selected, 1),
            'line-width': 7,
            'line-opacity': ON_GROUND,
          }}
        />
      </Source>
      <Source id="route-decks" type="geojson" data={raised}>
        <Layer
          id="routes-on-decks"
          type="fill-extrusion"
          beforeId={beforeId}
          minzoom={DECKS_ZOOM}
          paint={{
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'part'], 'casing'],
              colors.casing,
              ['get', 'selected'],
              colors.selected,
              colors.alternate,
            ],
            // Rising with the deck under them
            'fill-extrusion-base': rising(['get', 'base']),
            'fill-extrusion-height': rising(['get', 'height']),
            'fill-extrusion-vertical-gradient': false,
          }}
        />
      </Source>
      {origin && (
        <Marker longitude={origin.lngLat[0]} latitude={origin.lngLat[1]}>
          <span className={`route-origin${origin.mine ? ' is-mine' : ''}`} />
        </Marker>
      )}
      {destination && (
        <Marker
          key={destination.lngLat.join()}
          longitude={destination.lngLat[0]}
          latitude={destination.lngLat[1]}
          anchor="bottom"
        >
          <span className="route-destination" />
        </Marker>
      )}
      {focused && (
        <Marker longitude={focused[0]} latitude={focused[1]}>
          <span className="route-step" />
        </Marker>
      )}
    </>
  )
}
