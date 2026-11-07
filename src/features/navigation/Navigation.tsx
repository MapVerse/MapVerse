import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import type { ExpressionSpecification, PaddingOptions } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { RISE_ZOOM, rising } from '../../map/style.ts'
import {
  formatArrival,
  formatDuration,
  maneuverIcon,
} from '../directions/directions.ts'
import {
  getRoutes,
  type Maneuver,
  type Route,
  type RouteRequest,
} from '../directions/valhalla.ts'
import { DECK_LANDMARKS } from '../landmarks/deckLandmarks.ts'
import { placeOnDecks, splitOnDecks } from '../landmarks/decks.ts'
import { useOnTerrain } from '../landmarks/useOnTerrain.ts'
import { formatDistance } from '../place/place.ts'
import { FOLLOW_PITCH, followZoom, nearestBearing } from './camera.ts'
import { isArrival, prepareCourse } from './course.ts'
import { splitAt } from './geometry.ts'
import { useMuted } from './muted.ts'
import {
  advance,
  isOffRoute,
  mayReroute,
  rejoin,
  remaining,
  startNavigation,
  type Navigation as Nav,
} from './session.ts'
import type { Fix } from './smoothing.ts'
import { hush, speak, watchVoices } from './speech.ts'
import { useWakeLock } from './useWakeLock.ts'
import { announcement, departure, type Said } from './voice.ts'
import './Navigation.css'

type Props = {
  route: Route
  /** What the route was asked for with: its points, way and options */
  request: RouteRequest
  colors: { casing: string; selected: string; alternate: string }
  /** Style layer to draw the route beneath, so labels stay readable */
  beforeId?: string
  /** Ends it, with why when it could not go on */
  onEnd: (problem?: string) => void
}

/** How long a route asked for again may take, in ms. */
const REROUTE_TIMEOUT_MS = 20_000

/** Routes on the ground, but not along a deck once the deck is drawn. */
const ON_GROUND: ExpressionSpecification = [
  'step',
  ['zoom'],
  1,
  RISE_ZOOM,
  ['case', ['get', 'onDeck'], 0, 1],
]

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const isPhone = () => window.matchMedia('(max-width: 640px)').matches

/** A fix from the device, as the session takes it. */
const toFix = ({ coords, timestamp }: GeolocationPosition): Fix => ({
  lngLat: [coords.longitude, coords.latitude],
  accuracy: coords.accuracy,
  heading: coords.heading,
  speed: coords.speed,
  time: timestamp,
})

/**
 * What a maneuver says ahead of it: an arrival as where it will be, not
 * as already there ("Hedefiniz solda kalacak.").
 */
function ahead(m: Maneuver): string {
  if (!isArrival(m)) return m.instruction
  return m.verbal?.alert ?? (m.stop ? `${m.stop}. durak` : 'Varış noktası')
}

/** The icon for a maneuver, a stop's pin for a stop. */
const iconOf = (m: Maneuver) => (m.stop ? 'pin' : maneuverIcon(m.type))

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 9.4H8L12.6 5.4V18.6L8 14.6H4.5Z" />
      {muted ? (
        <path d="M16 9.5L21 14.5M21 9.5L16 14.5" />
      ) : (
        <path d="M15.8 9.2A4 4 0 0 1 15.8 14.8M18.4 6.6A7.6 7.6 0 0 1 18.4 17.4" />
      )}
    </svg>
  )
}

/**
 * Turn by turn, following the device's position along a route: the next
 * maneuver in a banner at the top, the time and way left at the bottom,
 * the map following behind the position as an arrow, leaning ahead and
 * turned the way one goes. Off the route, the route is asked for again
 * from there; the turns are said aloud in Turkish, if the device can.
 */
export default function Navigation({
  route,
  request,
  colors,
  beforeId,
  onEnd,
}: Props) {
  const { current: map } = useMap()
  const { mode, avoid } = request
  const [nav, setNav] = useState<Nav>(() =>
    startNavigation(
      prepareCourse(
        route,
        request.points
          .slice(1, -1)
          .map((lngLat, i) => ({ number: i + 1, lngLat })),
        request.points[request.points.length - 1],
      ),
    ),
  )
  const [following, setFollowing] = useState(true)
  const [rerouting, setRerouting] = useState(false)
  const [signalLost, setSignalLost] = useState(false)
  const [muted, setMuted] = useMuted()
  const [canSpeak, setCanSpeak] = useState(false)
  const said = useRef<Said | null>(null)
  const lastReroute = useRef<number | null>(null)
  const reroute = useRef<AbortController | null>(null)
  const bannerRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const onEndRef = useRef(onEnd)
  const mutedRef = useRef(muted)
  useEffect(() => {
    onEndRef.current = onEnd
    mutedRef.current = muted
  })
  const say = (text: string) => {
    if (!mutedRef.current) speak(text)
  }

  useWakeLock(!nav.arrived)
  useEffect(() => watchVoices(setCanSpeak), [])

  // The device's position as it comes, until arrived
  const arrived = nav.arrived
  useEffect(() => {
    if (arrived) return
    if (!('geolocation' in navigator)) {
      onEndRef.current(
        'Bu cihazda konum bulunamadığı için navigasyon başlatılamadı.',
      )
      return
    }
    let fixed = false
    const watch = navigator.geolocation.watchPosition(
      (position) => {
        fixed = true
        setSignalLost(false)
        setNav((n) => advance(n, toFix(position)))
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          onEndRef.current(
            'Konumuna erişim izni verilmediği için navigasyon durduruldu.',
          )
        } else if (!fixed) {
          onEndRef.current('Konumun bulunamadığı için navigasyon durduruldu.')
        } else {
          // Lost for a while, as in a tunnel: on with the last known
          setSignalLost(true)
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(watch)
  }, [arrived])

  // Off the route: asked for again from here, to the rest of the way, at
  // most once in a while
  useEffect(() => {
    const now = Date.now()
    if (!isOffRoute(nav) || rerouting || !nav.smoothed) return
    if (!mayReroute(lastReroute.current, now)) return
    lastReroute.current = now
    setRerouting(true)
    say('Rota yeniden hesaplanıyor.')
    const { stops, destination } = remaining(nav)
    const controller = new AbortController()
    reroute.current = controller
    const timer = setTimeout(() => controller.abort(), REROUTE_TIMEOUT_MS)
    getRoutes(
      {
        points: [
          nav.smoothed.lngLat,
          ...stops.map((s) => s.lngLat),
          destination,
        ],
        mode,
        avoid,
        when: { kind: 'now' },
        ...(nav.heading !== null && { heading: nav.heading }),
      },
      controller.signal,
    )
      .then(([next]) => {
        if (!next) return
        said.current = null
        setNav((n) => rejoin(n, prepareCourse(next, stops, destination)))
      })
      // Tried again a while later, if still off the route
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer)
        setRerouting(false)
      })
  }, [nav, rerouting]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => reroute.current?.abort(), [])

  // Said aloud: the way off, then each maneuver as it comes, the stops
  // and the arrival
  const started = nav.smoothed !== null
  const { progress, course, reached } = nav
  useEffect(() => {
    if (started) say(departure(course.maneuvers))
    // Once, as the first fix comes
  }, [started]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!started || !nav.onRoute || nav.arrived || rerouting) return
    const next = announcement(
      course.maneuvers,
      progress.next,
      progress.toNext,
      mode,
      said.current,
    )
    if (!next) return
    said.current = next.said
    say(next.text)
  }) // Each fix
  const reachedCount = reached.length
  useEffect(() => {
    const last = reached.at(-1)
    if (last !== undefined) say(`${last}. durağa vardınız.`)
  }, [reachedCount]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (arrived) say('Varış noktasına ulaştınız.')
  }, [arrived]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (muted) hush()
  }, [muted])
  useEffect(() => () => hush(), [])

  // Moving the map by hand lets it be, until it is put back to follow
  useEffect(() => {
    const m = map?.getMap()
    if (!m) return
    const byHand = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) setFollowing(false)
    }
    const events = [
      'dragstart',
      'zoomstart',
      'rotatestart',
      'pitchstart',
    ] as const
    for (const type of events) m.on(type, byHand)
    return () => {
      for (const type of events) m.off(type, byHand)
    }
  }, [map])

  /** Room round the position: the banner above, the bar below, and the
   *  position low on the map, so more of the way ahead shows. */
  function followPadding(): PaddingOptions {
    const frame = map?.getContainer().getBoundingClientRect()
    const banner = bannerRef.current?.getBoundingClientRect()
    const bar = barRef.current?.getBoundingClientRect()
    if (!frame) return { top: 0, right: 0, bottom: 0, left: 0 }
    const below = bar ? frame.bottom - bar.top : 90
    const above = banner ? banner.bottom - frame.top : 120
    const room = Math.max(0, frame.height - above - below)
    const left =
      !isPhone() && banner ? Math.max(0, banner.right - frame.left) : 0
    return {
      top: above + room * 0.45,
      bottom: below,
      left,
      right: 0,
    }
  }

  // Following the position: the map leans ahead, turned the way one
  // goes, closer in the slower one goes; straight there without motion
  const { position, heading, speed } = nav
  useEffect(() => {
    const m = map?.getMap()
    if (!m || !following || !position) return
    const camera = {
      center: position,
      bearing:
        heading === null
          ? m.getBearing()
          : nearestBearing(m.getBearing(), heading),
      pitch: FOLLOW_PITCH,
      zoom: followZoom(speed, mode),
      padding: followPadding(),
    }
    if (reducedMotion()) m.jumpTo(camera)
    else m.easeTo({ ...camera, duration: 1000, easing: (t) => t })
    // Not on the padding, which is worked out afresh each time
  }, [map, following, position, heading, speed, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // The map back as it was, round the user, once it ends
  useEffect(() => {
    const m = map?.getMap()
    return () => {
      m?.stop()
      m?.setPadding({ top: 0, right: 0, bottom: 0, left: 0 })
    }
  }, [map])

  // The route, the way behind greyed (in steps of 10 m, so it is not
  // drawn anew for each wobble)
  const behind = Math.floor(nav.along / 10) * 10
  const splits = useMemo(() => {
    const [done, ahead] = splitAt(course.line, behind)
    return [
      { coordinates: done, travelled: true },
      { coordinates: ahead, travelled: false },
    ]
      .filter((part) => part.coordinates.length > 1)
      .map(({ coordinates, travelled }) => ({
        split: splitOnDecks(coordinates, DECK_LANDMARKS),
        properties: { selected: !travelled, travelled },
      }))
  }, [course, behind])
  const { ground, decks } = useMemo(() => placeOnDecks(splits), [splits])
  const raised = useOnTerrain(decks)

  const { maneuvers } = course
  const next = maneuvers[progress.next]
  const after = !isArrival(next) ? maneuvers[progress.next + 1] : undefined
  // The street turned onto, or on the way to an arrival, the one it is on
  const street = isArrival(next)
    ? maneuvers[progress.next - 1]?.streets[0]
    : next.streets[0]
  const stopsLeft = course.stops.filter((s) => !reached.includes(s.number))
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(timer)
  }, [])

  const notice = rerouting
    ? 'Rota yeniden hesaplanıyor…'
    : signalLost
      ? 'Konum sinyali bekleniyor…'
      : !started
        ? 'Konum bekleniyor…'
        : null

  return (
    <>
      <div className="navigation">
        <section
          ref={bannerRef}
          className={`navigation-banner${arrived ? ' is-arrived' : ''}`}
          aria-label="Sıradaki adım"
        >
          {arrived ? (
            <div className="navigation-turn">
              <span className="navigation-turn-icon">
                <Icon name="flag" size={30} strokeWidth={2} />
              </span>
              <span className="navigation-turn-text">
                <strong className="navigation-street">
                  Varış noktasına ulaştınız
                </strong>
              </span>
            </div>
          ) : (
            <>
              <div className="navigation-turn" aria-live="polite">
                <span className="navigation-turn-icon">
                  <Icon name={iconOf(next)} size={30} strokeWidth={2} />
                </span>
                <span className="navigation-turn-text">
                  <span className="navigation-distance">
                    {formatDistance(progress.toNext)}
                  </span>
                  {street && (
                    <strong className="navigation-street">{street}</strong>
                  )}
                  <span className="navigation-instruction">{ahead(next)}</span>
                </span>
              </div>
              {after && (
                <p className="navigation-then">
                  <span>Sonra:</span>
                  <Icon name={iconOf(after)} size={16} strokeWidth={2} />
                  <span className="navigation-then-text">{ahead(after)}</span>
                </p>
              )}
            </>
          )}
          <p className="navigation-notice" role="status">
            {notice}
          </p>
        </section>

        {!following && !arrived && (
          <button
            type="button"
            className="navigation-recenter mv-glass"
            onClick={() => setFollowing(true)}
          >
            <Icon name="locate" size={18} />
            Yeniden ortala
          </button>
        )}

        <section
          ref={barRef}
          className="navigation-bar mv-glass"
          aria-label="Kalan yol"
        >
          {arrived ? (
            <div className="navigation-left">
              <strong>Yolculuk tamamlandı</strong>
            </div>
          ) : (
            <div className="navigation-left">
              <strong className="navigation-time">
                {formatDuration(progress.seconds)}
              </strong>
              <span className="navigation-meta">
                {formatDistance(progress.meters)} · Varış{' '}
                {formatArrival(progress.seconds, now)}
              </span>
            </div>
          )}
          {canSpeak && !arrived && (
            <button
              type="button"
              className="navigation-round"
              aria-pressed={muted}
              aria-label="Sessiz"
              title={muted ? 'Sesi aç' : 'Sesi kapat'}
              onClick={() => setMuted(!muted)}
            >
              <SpeakerIcon muted={muted} />
            </button>
          )}
          <button
            type="button"
            className="navigation-end"
            onClick={() => onEnd()}
          >
            {arrived ? 'Tamam' : 'Bitir'}
          </button>
        </section>
      </div>

      <Source id="navigation-route" type="geojson" data={ground}>
        <Layer
          id="navigation-casing"
          type="line"
          beforeId={beforeId}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': colors.casing,
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 9, 18, 18],
            'line-opacity': ON_GROUND,
          }}
        />
        <Layer
          id="navigation-line"
          type="line"
          beforeId={beforeId}
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': [
              'case',
              ['get', 'travelled'],
              colors.alternate,
              colors.selected,
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 6, 18, 12],
            'line-opacity': ON_GROUND,
          }}
        />
      </Source>
      <Source id="navigation-decks" type="geojson" data={raised}>
        <Layer
          id="navigation-on-decks"
          type="fill-extrusion"
          beforeId={beforeId}
          minzoom={RISE_ZOOM}
          paint={{
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'part'], 'casing'],
              colors.casing,
              ['get', 'travelled'],
              colors.alternate,
              colors.selected,
            ],
            'fill-extrusion-base': rising(['get', 'base']),
            'fill-extrusion-height': rising(['get', 'height']),
            'fill-extrusion-vertical-gradient': false,
          }}
        />
      </Source>
      {stopsLeft.map((stop) => (
        <Marker
          key={stop.number}
          longitude={stop.lngLat[0]}
          latitude={stop.lngLat[1]}
        >
          <span className="route-stop">{stop.number}</span>
        </Marker>
      ))}
      <Marker
        longitude={course.destination[0]}
        latitude={course.destination[1]}
        anchor="bottom"
      >
        <span className="route-destination" />
      </Marker>
      {position && (
        <Marker
          longitude={position[0]}
          latitude={position[1]}
          rotation={heading ?? 0}
          rotationAlignment="map"
          pitchAlignment="map"
        >
          <NavigationArrow pointing={heading !== null} />
        </Marker>
      )}
    </>
  )
}

/** Where one is: an arrow the way one goes, or a dot until that is known. */
function NavigationArrow({ pointing }: { pointing: boolean }) {
  return (
    <span
      className={`navigation-arrow${pointing ? '' : ' is-still'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={40} height={40}>
        <circle cx="20" cy="20" r="18" className="navigation-arrow-halo" />
        {pointing ? (
          <path
            d="M20 7L29.5 30L20 25L10.5 30Z"
            className="navigation-arrow-head"
          />
        ) : (
          <circle cx="20" cy="20" r="8" className="navigation-arrow-head" />
        )}
      </svg>
    </span>
  )
}
