import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import { setMeasuring, useMeasuring } from '../measure/measureMode.ts'
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
import { DECK_LANDMARKS } from '../landmarks/deckLandmarks.ts'
import { placeOnDecks, splitOnDecks } from '../landmarks/decks.ts'
import { useOnTerrain } from '../landmarks/useOnTerrain.ts'
import CategoryBadge from '../place/CategoryBadge.tsx'
import { copyText } from '../place/clipboard.ts'
import { distanceMeters, formatDistance, type Place } from '../place/place.ts'
import { reverseGeocode, type SearchResult } from '../search/photon.ts'
import { MIN_QUERY_LENGTH, usePlaceSearch } from '../search/usePlaceSearch.ts'
import { loadAvoid, saveAvoid } from './avoid.ts'
import {
  formatDuration,
  maneuverIcon,
  routeLabels,
  routeVia,
  shapeBounds,
} from './directions.ts'
import {
  directionsUrl,
  MAX_STOPS,
  type SharedDirections,
  type SharedPoint,
} from './share.ts'
import { googleTransitUrl, type Mode } from './transit.ts'
import { useRoutes } from './useRoutes.ts'
import {
  canAvoid,
  type Avoid,
  type RouteRequest,
  type TravelMode,
  type When,
} from './valhalla.ts'
import {
  formatClock,
  localValue,
  parseLocal,
  routeTimes,
  whenLabel,
} from './when.ts'
import './Directions.css'

/** One point of a route: an end, or a stop on the way. */
type End = {
  name: string
  lngLat: [number, number]
  categoryKey?: string
  /** The user's own location */
  mine?: boolean
}
/** A field for a point, the start first and the destination last, kept
 *  by its id as it is moved. */
type Slot = { id: number; end: End | null }

const MODES: { mode: Mode; label: string; icon: StrokeName }[] = [
  { mode: 'auto', label: 'Araba', icon: 'car' },
  { mode: 'pedestrian', label: 'Yürüyüş', icon: 'walk' },
  { mode: 'bicycle', label: 'Bisiklet', icon: 'bike' },
  { mode: 'transit', label: 'Toplu taşıma', icon: 'bus' },
]

const AVOIDS: { key: keyof Avoid; label: string }[] = [
  { key: 'tolls', label: 'Ücretli yollardan kaçın' },
  { key: 'highways', label: 'Otoyoldan kaçın' },
  { key: 'ferries', label: 'Feribottan kaçın' },
]

const WHENS: { kind: When['kind']; label: string }[] = [
  { kind: 'now', label: 'Şimdi çık' },
  { kind: 'depart', label: 'Çıkış saati' },
  { kind: 'arrive', label: 'Varış saati' },
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
 * of it not yet: it is drawn in from its start when it comes. This runs on
 * the whole route as one line, as the ground's pieces of it (split round
 * bridges' decks) would each be drawn in from their own start at once.
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

/** How far the sheet is pulled before it is taken as a pull, in px. */
const PULL_PX = 24

/** How often to bring arrival times up to date, in ms. */
const CLOCK_MS = 30_000

/** How long a passing notice (a link copied) stays, in ms. */
const NOTICE_MS = 3500

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

/** Now, a little on: the next five minutes, as a time to be picked. */
function soon(): string {
  const at = new Date(Date.now() + 5 * 60_000)
  at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5, 0, 0)
  return localValue(at)
}

type Suggestion =
  { kind: 'locate' } | { kind: 'map' } | { kind: 'place'; place: SearchResult }

/** What stands open under the card instead of the routes. */
type Panel = 'when' | 'avoid'

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Props = {
  /** Where to go; when missing, the destination is asked for */
  to: Place | null
  /** Directions opened from a shared link, to start from instead */
  shared?: SharedDirections | null
  /** Style layer to draw routes beneath, so labels stay readable */
  beforeId?: string
  onClose: () => void
  /** On its way out, once closed */
  leaving?: boolean
}

/** The fields to start with: from a shared link, or to a place. */
function firstSlots(to: Place | null, shared?: SharedDirections | null) {
  if (shared) {
    return shared.points.map((point, id) => ({
      id,
      end: point && { name: point.name, lngLat: point.lngLat },
    }))
  }
  return [
    { id: 0, end: null },
    {
      id: 1,
      end: to && {
        name: to.name,
        lngLat: to.lngLat,
        categoryKey: to.categoryKey,
      },
    },
  ]
}

/**
 * Directions: a card to set both ends of a route and any stops on the way
 * (searched for, the user's location, or picked on the map), how and when
 * to travel and what to keep off, and the routes found, each with its
 * turns. On a wide screen it all stands in a column beside the map; on a
 * phone the card stays at the top and the routes come up in a sheet from
 * the bottom, pulled up for the turns.
 */
export default function Directions({
  to,
  shared,
  beforeId,
  onClose,
  leaving = false,
}: Props) {
  const { current: map } = useMap()
  const plannerRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const fieldsRef = useRef<HTMLDivElement>(null)
  const inputs = useRef(new Map<number, HTMLInputElement>())
  const handles = useRef(new Map<number, HTMLButtonElement>())
  const sheetPull = useRef<{
    from: number
    by: number
    height: number
  } | null>(null)
  // When a pull of the sheet last ended, so the click after it is let be
  const sheetPulled = useRef(0)
  // How many times each point has been set, by its field's id
  const changes = useRef(new Map<number, number>())
  const listId = useId()
  const theme = useTheme()
  const colors =
    useMapDesign() === 'san-andreas' ? SAN_ANDREAS_ROUTE : ROUTE_COLORS[theme]

  const [mode, setMode] = useState<Mode>(shared?.mode ?? 'auto')
  const [slots, setSlots] = useState<Slot[]>(() => firstSlots(to, shared))
  const nextId = useRef(slots.length)
  const [avoid, setAvoid] = useState<Avoid>(() => shared?.avoid ?? loadAvoid())
  const [when, setWhen] = useState<When>(shared?.when ?? { kind: 'now' })
  // When being picked, until the panel is closed
  const [whenDraft, setWhenDraft] = useState<When>(when)
  const [panel, setPanel] = useState<Panel | null>(null)
  // The start is the user's location, unless it is set otherwise
  const startsHere = canLocate && !slots[0].end
  // Which point the user's location is being found for
  const [locating, setLocating] = useState<number | null>(
    startsHere ? slots[0].id : null,
  )
  const [notice, setNotice] = useState<{
    text: string
    problem?: boolean
  } | null>(null)
  // The point being typed in, and what has been typed
  const [editing, setEditing] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  // The point the next click on the map, or the pin's place, sets
  const [picking, setPicking] = useState<number | null>(null)
  const [selected, setSelected] = useState(0)
  const [step, setStep] = useState<number | null>(null)
  // On a phone, whether the sheet is pulled up to show the turns
  const [expanded, setExpanded] = useState(false)
  // A field being dragged to another place in the list, and how far
  const [drag, setDrag] = useState<{
    id: number
    by: number
    /** The routes asked for as it was picked up */
    request: RouteRequest | null
  } | null>(null)
  const dragFrom = useRef(0)
  // Said to a screen reader as a field is moved
  const [moved, setMoved] = useState('')

  const origin = slots[0].end
  const destination = slots[slots.length - 1].end
  const stopCount = slots.length - 2
  // The points set, and the stops among them numbered in order
  const filled = slots.filter((s) => s.end)
  const stops = slots.slice(1, -1).filter((s) => s.end)
  const stopNumber = new Map(stops.map((slot, i) => [slot.id, i + 1]))
  const routable = mode !== 'transit' && !!origin && !!destination
  const request: RouteRequest | null = routable
    ? {
        points: filled.map((s) => s.end!.lngLat),
        mode: mode as TravelMode,
        avoid,
        when,
      }
    : null
  // While a field is dragged, the routes wait for where it is let go
  const { routes, status, reason, retry } = useRoutes(
    drag ? drag.request : request,
  )
  const route = routes[selected] ?? routes[0]
  const labels = routeLabels(routes)
  const search = usePlaceSearch(editing !== null ? query : '')

  const slotOf = (id: number) => slots.find((s) => s.id === id)
  const indexOf = (id: number) => slots.findIndex((s) => s.id === id)

  /** Starts the routes afresh: the first, whole, with the sheet down. */
  function freshRoutes() {
    setSelected(0)
    setStep(null)
    setExpanded(false)
  }

  function setEnd(id: number, end: End | null) {
    // Whatever was set last wins over a location still being found
    changes.current.set(id, (changes.current.get(id) ?? 0) + 1)
    setSlots((all) => all.map((s) => (s.id === id ? { ...s, end } : s)))
    freshRoutes()
  }

  /** Finds the user's location for a point, unless it is set otherwise first. */
  function findMe(id: number) {
    const change = changes.current.get(id) ?? 0
    const current = () => (changes.current.get(id) ?? 0) === change
    whereAmI()
      .then((lngLat) => {
        if (current()) setEnd(id, { name: 'Konumum', lngLat, mine: true })
      })
      .catch(
        () =>
          current() &&
          setNotice({ text: 'Konumuna erişilemedi.', problem: true }),
      )
      .finally(() => setLocating((t) => (t === id ? null : t)))
  }

  function locate(id: number) {
    setLocating(id)
    setNotice(null)
    findMe(id)
  }

  /** Sets a point to one picked on the map, named by its address. */
  function picked(id: number, lngLat: [number, number]) {
    setEnd(id, { name: 'Haritada seçilen nokta', lngLat })
    setPicking(null)
    reverseGeocode(lngLat)
      .then((address) => {
        if (!address) return
        const name = shortAddress(address)
        setSlots((all) =>
          all.map((s) =>
            s.id === id && s.end?.lngLat === lngLat
              ? { ...s, end: { ...s.end, name } }
              : s,
          ),
        )
      })
      .catch(() => {})
  }

  // Start from the user's location, as long as they allow it; with nowhere
  // to go yet, ask for that first
  useEffect(() => {
    if (startsHere) findMe(slots[0].id)
    if (!slots[slots.length - 1].end) {
      inputs.current.get(slots[slots.length - 1].id)?.focus()
    }
    // Only as it opens
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A passing notice goes by itself
  useEffect(() => {
    if (!notice || notice.problem) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  /** Closes the panel under the card, taking the time picked in it. */
  function closePanel() {
    if (panel === 'when') {
      const at = whenDraft.kind !== 'now' && parseLocal(whenDraft.at)
      const next: When = at ? whenDraft : { kind: 'now' }
      if (JSON.stringify(next) !== JSON.stringify(when)) {
        setWhen(next)
        freshRoutes()
      }
    }
    setPanel(null)
  }

  function togglePanel(next: Panel) {
    if (panel === next) return closePanel()
    if (panel) closePanel()
    if (next === 'when') setWhenDraft(when)
    setPicking(null)
    setPanel(next)
  }

  // Escape closes the panel, steps back out of picking a point, or else
  // closes directions (a field being typed in takes its own Escape first)
  useEffect(() => {
    if (leaving) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (panel) closePanel()
      else if (picking !== null) setPicking(null)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }) // Each render, as closing the panel reads what it holds now

  // Measuring takes the map's clicks: picking a point stops for it
  const measuring = useMeasuring()
  useEffect(() => {
    if (measuring) setPicking(null)
  }, [measuring])

  // While picking, the next click on the map sets that point of the route
  useEffect(() => {
    if (picking === null || !map) return
    // The click is the route's: measuring, if on, steps aside for it
    setMeasuring(false)
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
    // By public transport, the two ends it is opened with
    const shape =
      route?.shape ??
      (mode === 'transit' && origin && destination
        ? [origin.lngLat, destination.lngLat]
        : null)
    const bounds = shape && shapeBounds(shape)
    if (!map || !bounds) return
    map.fitBounds(bounds, { padding: padding(), duration: 800 })
  }

  // Fit each route as it comes, or is picked
  const ends = mode === 'transit' && `${origin?.lngLat}|${destination?.lngLat}`
  useEffect(fitRoute, [map, route, ends]) // eslint-disable-line react-hooks/exhaustive-deps

  // Draw the picked route in from its start: the whole of it as one line
  // while it is drawn in, then its pieces on the ground as before
  useEffect(() => {
    const style = map?.getMap()
    if (!style || !route || reducedMotion()) return
    const drawing = (on: boolean) => {
      if (style.getLayer('routes-drawing')) {
        style.setLayoutProperty(
          'routes-drawing',
          'visibility',
          on ? 'visible' : 'none',
        )
      }
      if (style.getLayer('routes-selected')) {
        style.setPaintProperty(
          'routes-selected',
          'line-opacity',
          on ? 0 : ON_GROUND,
        )
      }
    }
    const draw = (progress: number) => {
      if (!style.getLayer('routes-drawing')) return
      style.setPaintProperty(
        'routes-drawing',
        'line-gradient',
        drawnTo(colors.selected, progress),
      )
    }
    draw(0)
    drawing(true)
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      // A frame may be stamped a little before the effect ran
      const t = Math.min(1, Math.max(0, now - start) / DRAW_MS)
      draw(1 - (1 - t) ** 3)
      if (t < 1) frame = requestAnimationFrame(tick)
      else drawing(false)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      drawing(false)
    }
  }, [map, route, colors.selected])

  // Arrival times and the day said for a time, kept up to the clock
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

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

  /** The other way round: the destination first, the stops in reverse. */
  function swap() {
    setSlots((all) => [...all].reverse())
    freshRoutes()
  }

  function addStop() {
    if (stopCount >= MAX_STOPS) return
    const id = nextId.current++
    setSlots((all) => [...all.slice(0, -1), { id, end: null }, all.at(-1)!])
    // Straight on to finding it
    requestAnimationFrame(() => inputs.current.get(id)?.focus())
  }

  function removeStop(id: number) {
    const at = indexOf(id)
    changes.current.delete(id)
    setSlots((all) => all.filter((s) => s.id !== id))
    if (locating === id) setLocating(null)
    if (picking === id) setPicking(null)
    freshRoutes()
    // Focus stays in the list, on the field that takes its place
    const next = slots[at + 1] ?? slots[at - 1]
    requestAnimationFrame(() => next && inputs.current.get(next.id)?.focus())
  }

  /** Moves a field to another place in the list. */
  function moveTo(id: number, to: number) {
    const from = indexOf(id)
    if (from < 0 || to < 0 || to >= slots.length || to === from) return
    const next = [...slots]
    const [slot] = next.splice(from, 1)
    next.splice(to, 0, slot)
    setSlots(next)
    freshRoutes()
    setMoved(
      `${slot.end?.name ?? 'Boş alan'}, ${to + 1}. sıraya taşındı (${
        to === 0 ? 'başlangıç' : to === slots.length - 1 ? 'varış' : 'durak'
      }).`,
    )
  }

  // Said once, then out of the way of what is said of the routes
  useEffect(() => {
    if (!moved) return
    const timer = setTimeout(() => setMoved(''), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [moved])

  // A moved field keeps the focus of its handle, as the list is reordered
  const refocus = useRef<number | null>(null)
  useEffect(() => {
    if (refocus.current === null) return
    handles.current.get(refocus.current)?.focus()
    refocus.current = null
  }, [slots])

  function onHandleKey(id: number, event: KeyboardEvent<HTMLButtonElement>) {
    const by =
      event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : null
    if (by === null) return
    event.preventDefault()
    refocus.current = id
    moveTo(id, indexOf(id) + by)
  }

  /** How far apart the fields stand, top to top, in px. */
  function rowStep(): number {
    const rows = fieldsRef.current?.children
    if (!rows || rows.length < 2) return 50
    return (
      rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top
    )
  }

  // A field dragged by its handle follows the finger, and the others make
  // way for it as it passes them
  function onHandleDown(id: number, event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragFrom.current = event.clientY
    setDrag({ id, by: 0, request })
  }

  function onHandleMove(id: number, event: PointerEvent<HTMLButtonElement>) {
    if (drag?.id !== id) return
    const by = event.clientY - dragFrom.current
    const rowPx = rowStep()
    const shift = Math.trunc((by + Math.sign(by) * rowPx * 0.5) / rowPx)
    const from = indexOf(id)
    const to = Math.min(Math.max(from + shift, 0), slots.length - 1)
    if (to !== from) {
      // Under the finger still, from its new place
      dragFrom.current += (to - from) * rowPx
      moveTo(id, to)
      setDrag({ ...drag, by: event.clientY - dragFrom.current })
    } else {
      setDrag({ ...drag, by })
    }
  }

  function onHandleUp() {
    setDrag(null)
  }

  // What to offer under the point being typed in
  const suggestions: Suggestion[] =
    editing !== null
      ? [
          ...(canLocate ? [{ kind: 'locate' } as const] : []),
          { kind: 'map' } as const,
          ...search.results.map((place) => ({ kind: 'place', place }) as const),
        ]
      : []
  const typed = query.trim().length >= MIN_QUERY_LENGTH

  function choose(suggestion: Suggestion) {
    const id = editing
    if (id === null) return
    setEditing(null)
    inputs.current.get(id)?.blur()
    if (suggestion.kind === 'locate') locate(id)
    else if (suggestion.kind === 'map') setPicking(id)
    else {
      const { name, lngLat, categoryKey } = suggestion.place
      setEnd(id, { name, lngLat, categoryKey })
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

  /** The suggestions listed under a point, and each one in it. */
  const listOf = (id: number) => `${listId}-${id}`
  const optionOf = (id: number, i: number) => `${listOf(id)}-${i}`

  /** What a field is called, by where it stands. */
  function fieldName(index: number, id: number): string {
    if (index === 0) return 'Başlangıç'
    if (index === slots.length - 1) return 'Varış'
    const n = stopNumber.get(id)
    return n ? `${n}. durak` : 'Durak'
  }

  function field(slot: Slot, index: number) {
    const { id, end } = slot
    const isEditing = editing === id
    const isStop = index > 0 && index < slots.length - 1
    const kind = index === 0 ? 'origin' : isStop ? 'stop' : 'destination'
    const name = fieldName(index, id)
    const inputId = `${listOf(id)}-input`
    // Its list stands open only while it is typed in
    const open = isEditing && suggestions.length > 0
    const movable = slots.length > 2
    const dot = (
      <span className={`directions-dot directions-dot-${kind}`}>
        {isStop && stopNumber.get(id)}
      </span>
    )
    return (
      <div
        key={id}
        className={`directions-field${isEditing ? ' is-editing' : ''}${
          drag?.id === id ? ' is-dragged' : ''
        }`}
        style={
          drag?.id === id
            ? ({ '--drag': `${drag.by}px` } as CSSProperties)
            : undefined
        }
        onClick={(event) => {
          // Anywhere in the field but its buttons types into it
          if (!(event.target as Element).closest('button')) {
            inputs.current.get(id)?.focus()
          }
        }}
      >
        {movable ? (
          <button
            ref={(el) => {
              if (el) handles.current.set(id, el)
              else handles.current.delete(id)
            }}
            type="button"
            className="directions-handle"
            aria-label={`${name}: taşı`}
            aria-description="Yukarı ve aşağı ok tuşlarıyla sırasını değiştir"
            title="Sürükleyerek sırala"
            onPointerDown={(event) => onHandleDown(id, event)}
            onPointerMove={(event) => onHandleMove(id, event)}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            onKeyDown={(event) => onHandleKey(id, event)}
          >
            {dot}
          </button>
        ) : (
          <span className="directions-handle">{dot}</span>
        )}
        <input
          ref={(el) => {
            if (el) inputs.current.set(id, el)
            else inputs.current.delete(id)
          }}
          id={inputId}
          type="text"
          role="combobox"
          aria-label={name}
          aria-expanded={open}
          aria-controls={open ? listOf(id) : undefined}
          aria-activedescendant={
            open && suggestions[active] ? optionOf(id, active) : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={
            locating === id
              ? 'Konum alınıyor…'
              : index === 0
                ? 'Nereden?'
                : isStop
                  ? 'Nereye uğranacak?'
                  : 'Nereye?'
          }
          value={isEditing ? query : (end?.name ?? '')}
          onFocus={(event) => {
            if (panel) closePanel()
            setEditing(id)
            setPicking(null)
            setQuery(end && !end.mine ? end.name : '')
            setActive(-1)
            const input = event.currentTarget
            requestAnimationFrame(() => input.select())
          }}
          onBlur={() => setEditing((t) => (t === id ? null : t))}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(-1)
          }}
          onKeyDown={onFieldKey}
        />
        {end?.mine && !isEditing && <Icon name="locate" size={16} />}
        {isStop && (
          <button
            type="button"
            className="directions-remove"
            aria-label={`${name}: kaldır`}
            title="Durağı kaldır"
            onClick={() => removeStop(id)}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    )
  }

  /** The directions as they would be shared: "my location" as the opener's. */
  function toShare(): SharedDirections {
    const points: SharedPoint[] = filled.map(({ end }, i) => {
      if (end!.mine && i === 0 && origin) return null
      return {
        name: end!.mine ? 'Paylaşan kişinin konumu' : end!.name,
        lngLat: end!.lngLat,
      }
    })
    // A start not set yet is the opener's own location too
    if (!origin) points.unshift(null)
    return { points, mode, avoid, when }
  }

  async function share() {
    if (!destination) return
    const url = directionsUrl(toShare())
    if (navigator.share) {
      try {
        await navigator.share({ title: `${destination.name} yol tarifi`, url })
      } catch {
        // Dismissed
      }
      return
    }
    setNotice(
      (await copyText(url))
        ? { text: 'Bağlantı kopyalandı.' }
        : { text: 'Bağlantı kopyalanamadı.', problem: true },
    )
  }

  // On a phone, pull the sheet up for the turns or down for just the
  // routes; it follows the finger meanwhile. A tap, a key or a screen
  // reader works it as a button, by its click.
  function onSheetDown(event: PointerEvent<HTMLElement>) {
    const sheet = resultsRef.current
    if (!isPhone() || !sheet) return
    sheetPull.current = {
      from: event.clientY,
      by: 0,
      height: sheet.getBoundingClientRect().height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onSheetMove(event: PointerEvent<HTMLElement>) {
    const pull = sheetPull.current
    const sheet = resultsRef.current
    if (!pull || !sheet) return
    pull.by = event.clientY - pull.from
    if (Math.abs(pull.by) < PULL_PX / 2 && !sheet.style.maxHeight) return
    // As high as it may stand when pulled up, at most
    const room = (sheet.parentElement?.clientHeight ?? 0) * 0.78
    const height = Math.min(Math.max(pull.height - pull.by, 120), room)
    sheet.classList.add('is-pulling')
    sheet.style.maxHeight = `${height}px`
  }

  /** Lets go of the sheet, to settle up or down. */
  function letGo() {
    const sheet = resultsRef.current
    sheet?.classList.remove('is-pulling')
    sheet?.style.removeProperty('max-height')
  }

  function onSheetUp() {
    const pulled = sheetPull.current
    sheetPull.current = null
    letGo()
    if (!pulled || Math.abs(pulled.by) <= PULL_PX) return
    // A pull, not a tap: the click that follows is not to toggle it again
    sheetPulled.current = performance.now()
    setExpanded(pulled.by < 0)
  }

  function onSheetClick() {
    if (performance.now() - sheetPulled.current < 400) return
    setExpanded((e) => !e)
  }

  const between = stopCount > 0 ? 'Bu noktalar' : 'Bu iki nokta'
  const message =
    status === 'none'
      ? reason === 'too-far'
        ? `${between} arası rota hesaplamak için fazla uzak.`
        : reason === 'off-road'
          ? 'Noktalardan biri bir yola yakın değil; yola daha yakın bir yer seç.'
          : `${between} arasında rota bulunamadı.`
      : status === 'error'
        ? 'Rota şu anda hesaplanamıyor.'
        : null
  const transit = mode === 'transit'
  const showResults =
    editing === null &&
    !panel &&
    (transit ? !!destination : status === 'loading' || !!route || !!message)
  const avoided = AVOIDS.filter(
    ({ key }) => avoid[key] && mode !== 'transit' && canAvoid(mode, key),
  ).length

  // Along a bridge, routes run on its deck rather than the water below:
  // each route split round the decks once, then drawn picked or not
  const splits = useMemo(
    () => routes.map((r) => splitOnDecks(r.shape, DECK_LANDMARKS)),
    [routes],
  )
  const { ground, decks } = useMemo(
    () =>
      placeOnDecks(
        splits.map((split, i) => ({
          split,
          properties: { selected: routes[i] === route },
        })),
      ),
    [splits, routes, route],
  )
  // The picked route whole, to be drawn in from its start
  const drawing = useMemo<FeatureCollection<LineString>>(
    () => ({
      type: 'FeatureCollection',
      features: route
        ? [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: route.shape },
              properties: {},
            },
          ]
        : [],
    }),
    [route],
  )
  // What a screen reader is told of the routes as they come
  const announcement =
    moved ||
    (status === 'loading'
      ? 'Rota hesaplanıyor…'
      : (message ??
        (route
          ? `${routes.length > 1 ? `${routes.length} rota bulundu. ` : ''}${
              labels[0] ? `${labels[0]}: ` : ''
            }${formatDuration(routes[0].seconds)}, ${formatDistance(
              routes[0].meters,
            )}.`
          : '')))
  const raised = useOnTerrain(decks)
  const center = map?.getCenter().toArray()
  const focused =
    step !== null && route ? route.shape[route.maneuvers[step]?.at] : undefined

  /** When a route leaves and arrives, as its card says it. */
  function routeTime(r: (typeof routes)[number]): string {
    const { departs, arrives } = routeTimes(r, when, now)
    if (when.kind === 'now') return `Varış ${formatClock(arrives, now)}`
    if (when.kind === 'depart') {
      return `Çıkış ${formatClock(departs, departs)} · Varış ${formatClock(arrives, departs)}`
    }
    return `Çıkış ${formatClock(departs, arrives)} · Varış ${formatClock(arrives, arrives)}`
  }

  const pickingName =
    picking === null
      ? ''
      : indexOf(picking) === 0
        ? 'Başlangıç noktasını seç'
        : indexOf(picking) === slots.length - 1
          ? 'Varış noktasını seç'
          : 'Durağı seç'

  return (
    <>
      <div
        className={`directions${leaving ? ' is-leaving' : ''}${
          picking !== null ? ' is-picking' : ''
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
                  aria-label={m.label}
                  title={m.label}
                  onClick={() => {
                    setMode(m.mode)
                    freshRoutes()
                  }}
                >
                  <Icon name={m.icon} size={19} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="directions-ends">
            <div ref={fieldsRef} className="directions-fields">
              {slots.map(field)}
            </div>
            <button
              type="button"
              className="directions-swap"
              aria-label={
                stopCount > 0
                  ? 'Rotayı ters çevir'
                  : 'Başlangıç ile varışı değiştir'
              }
              title={stopCount > 0 ? 'Ters çevir' : 'Yer değiştir'}
              disabled={!origin && !destination}
              onClick={swap}
            >
              <Icon name="swap" size={20} />
            </button>
          </div>

          <div className="directions-actions">
            {!transit && stopCount < MAX_STOPS && (
              <button
                type="button"
                className="directions-chip"
                onClick={addStop}
              >
                <Icon name="plus" size={16} />
                Durak ekle
              </button>
            )}
            {!transit && (
              <button
                type="button"
                className={`directions-chip${
                  when.kind !== 'now' ? ' is-set' : ''
                }`}
                aria-expanded={panel === 'when'}
                aria-label={`Ne zaman: ${whenLabel(when, now)}`}
                onClick={() => togglePanel('when')}
              >
                <Icon name="clock" size={16} />
                {whenLabel(when, now)}
              </button>
            )}
            {!transit && (
              <button
                type="button"
                className={`directions-chip is-icon${avoided ? ' is-set' : ''}`}
                title="Seçenekler"
                aria-expanded={panel === 'avoid'}
                aria-label={`Rota seçenekleri${
                  avoided ? `: ${avoided} seçili` : ''
                }`}
                onClick={() => togglePanel('avoid')}
              >
                <Icon name="sliders" size={16} />
                {avoided > 0 && (
                  <span className="directions-chip-count">{avoided}</span>
                )}
              </button>
            )}
            <button
              type="button"
              className="directions-chip is-icon is-share"
              aria-label="Yol tarifini paylaş"
              title="Paylaş"
              disabled={!destination}
              onClick={share}
            >
              <Icon name="share" size={16} />
            </button>
          </div>
          <div role="status" aria-live="polite">
            {notice && (
              <p
                className={`directions-notice${
                  notice.problem ? ' is-problem' : ''
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>
        </section>

        {panel === 'when' && (
          <section className="directions-panel mv-glass" aria-label="Ne zaman">
            <div
              className="directions-segments"
              role="radiogroup"
              aria-label="Ne zaman"
              style={
                {
                  '--segment': WHENS.findIndex(
                    (w) => w.kind === whenDraft.kind,
                  ),
                } as CSSProperties
              }
            >
              {WHENS.map((w) => (
                <button
                  key={w.kind}
                  type="button"
                  role="radio"
                  aria-checked={w.kind === whenDraft.kind}
                  onClick={() =>
                    setWhenDraft((draft) =>
                      w.kind === 'now'
                        ? { kind: 'now' }
                        : {
                            kind: w.kind,
                            at: draft.kind === 'now' ? soon() : draft.at,
                          },
                    )
                  }
                >
                  {w.label}
                </button>
              ))}
            </div>
            {whenDraft.kind !== 'now' && (
              <div className="directions-when-fields">
                <label>
                  <span>Tarih</span>
                  <input
                    type="date"
                    value={whenDraft.at.slice(0, 10)}
                    onChange={(event) => {
                      const day = event.target.value
                      if (day) {
                        setWhenDraft({
                          ...whenDraft,
                          at: `${day}${whenDraft.at.slice(10)}`,
                        })
                      }
                    }}
                  />
                </label>
                <label>
                  <span>
                    {whenDraft.kind === 'depart' ? 'Çıkış' : 'Varış'} saati
                  </span>
                  <input
                    type="time"
                    value={whenDraft.at.slice(11)}
                    onChange={(event) => {
                      const time = event.target.value
                      if (time) {
                        setWhenDraft({
                          ...whenDraft,
                          at: `${whenDraft.at.slice(0, 11)}${time.slice(0, 5)}`,
                        })
                      }
                    }}
                  />
                </label>
              </div>
            )}
            <button
              type="button"
              className="directions-done"
              onClick={closePanel}
            >
              Tamam
            </button>
          </section>
        )}

        {panel === 'avoid' && (
          <section
            className="directions-panel mv-glass"
            aria-label="Rota seçenekleri"
          >
            <ul className="directions-avoids">
              {AVOIDS.map(({ key, label }) => {
                const can = !transit && canAvoid(mode as TravelMode, key)
                return (
                  <li key={key}>
                    <label className={can ? undefined : 'is-off'}>
                      <span className="directions-avoid-text">
                        {label}
                        {!can && <small>Yalnızca araba için</small>}
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        className="directions-switch"
                        checked={can && avoid[key]}
                        disabled={!can}
                        onChange={(event) => {
                          const next = { ...avoid, [key]: event.target.checked }
                          setAvoid(next)
                          saveAvoid(next)
                          freshRoutes()
                        }}
                      />
                    </label>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="directions-done"
              onClick={closePanel}
            >
              Tamam
            </button>
          </section>
        )}

        {editing !== null && (
          <section
            className="directions-suggestions mv-glass"
            aria-label="Öneriler"
            // Keep focus in the field, so a click on a suggestion lands
            onMouseDown={(event) => event.preventDefault()}
          >
            <ul id={listOf(editing)} role="listbox">
              {suggestions.map((suggestion, i) => (
                <li
                  key={
                    suggestion.kind === 'place'
                      ? `${suggestion.place.key}-${i}`
                      : suggestion.kind
                  }
                  id={optionOf(editing, i)}
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

        <p className="directions-live" role="status" aria-live="polite">
          {announcement}
        </p>

        {showResults && transit && destination && (
          <section
            className="directions-results directions-transit mv-glass"
            aria-label="Toplu taşıma"
          >
            <span className="directions-transit-icon">
              <Icon name="bus" size={22} />
            </span>
            <div className="directions-transit-text">
              <strong>Toplu taşıma başka bir uygulamada açılır</strong>
              <p>
                Otobüs, metro ve vapur saatlerini burada hesaplayamıyoruz. Aynı
                yolculuğu toplu taşıma tarifleri veren Google Haritalar'da aç
                {origin ? '' : '; başlangıç bulunduğun yer olur'}.
              </p>
              {stops.length > 0 && (
                <p className="directions-transit-note">
                  Duraklar bu bağlantıya eklenmez.
                </p>
              )}
            </div>
            <a
              className="directions-transit-link"
              href={googleTransitUrl(
                origin?.lngLat ?? null,
                destination.lngLat,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Haritalar'da aç
              <Icon name="external" size={16} />
            </a>
          </section>
        )}

        {showResults && !transit && (
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
              onPointerCancel={() => {
                sheetPull.current = null
                letGo()
              }}
              onClick={onSheetClick}
            />
            {status === 'loading' && (
              <div className="directions-loading">
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
              <div className="directions-message is-problem">
                <Icon name="info" size={18} />
                <span>{message}</span>
                {status === 'error' && (
                  <button
                    type="button"
                    className="directions-retry"
                    onClick={retry}
                  >
                    Tekrar dene
                  </button>
                )}
              </div>
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
                      name={
                        route.maneuvers[step].stop
                          ? 'pin'
                          : maneuverIcon(route.maneuvers[step].type)
                      }
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
                            {formatDistance(r.meters)} · {routeTime(r)}
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
                {when.kind !== 'now' &&
                  routes.length === 1 &&
                  filled.length === 2 && (
                    <p className="directions-hint">
                      Belirli bir saat için tek rota hesaplanır.
                    </p>
                  )}
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
                        className={m.stop ? 'is-stop' : undefined}
                        aria-current={i === step || undefined}
                        onClick={() => focusStep(i)}
                      >
                        <span className="directions-step-icon">
                          {m.stop ? (
                            <span className="directions-step-stop">
                              {m.stop}
                            </span>
                          ) : (
                            <Icon name={maneuverIcon(m.type)} size={18} />
                          )}
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

      {picking !== null && (
        <div className="directions-picking" role="status">
          {/* On a phone, the map moves under a pin in its middle */}
          <span className="directions-picking-pin" aria-hidden="true" />
          <div className="directions-picking-bar mv-glass">
            <span className="directions-picking-text">
              <strong>{pickingName}</strong>
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
                  if (at && slotOf(picking)) picked(picking, at)
                }}
              >
                Bu noktayı seç
              </button>
            </div>
          </div>
        </div>
      )}

      <Source id="routes" type="geojson" data={ground}>
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
            'line-color': colors.selected,
            'line-width': 7,
            'line-opacity': ON_GROUND,
          }}
        />
      </Source>
      <Source id="route-drawing" type="geojson" data={drawing} lineMetrics>
        {/* Shown only while the picked route is drawn in */}
        <Layer
          id="routes-drawing"
          type="line"
          beforeId={beforeId}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'none',
          }}
          paint={{
            'line-gradient': drawnTo(colors.selected, 1),
            'line-width': 7,
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
      {!transit &&
        stops.map(({ id, end }) => (
          <Marker
            key={`${id}:${end!.lngLat.join()}`}
            longitude={end!.lngLat[0]}
            latitude={end!.lngLat[1]}
          >
            <span className="route-stop">{stopNumber.get(id)}</span>
          </Marker>
        ))}
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
