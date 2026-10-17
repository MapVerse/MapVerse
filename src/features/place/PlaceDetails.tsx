import { useMap } from '@vis.gl/react-maplibre'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { useTheme } from '../../theme/theme.ts'
import { categoryInfo, labelColor } from './categories.ts'
import CategoryBadge from './CategoryBadge.tsx'
import {
  cuisine,
  email,
  features,
  osmUrl,
  phone,
  tagAddress,
  website,
  wikipedia,
} from './details.ts'
import {
  dayHours,
  describeOpenState,
  openState,
  parseOpeningHours,
  todayIndex,
  weekLines,
} from './openingHours.ts'
import type { Place } from './place.ts'
import { sharePlace } from './share.ts'
import { useAddress } from './useAddress.ts'
import { useNow, usePlaceDetails } from './usePlaceDetails.ts'
import './PlaceCard.css'
import './PlaceDetails.css'

type Props = {
  place: Place
  /** On its way out, once closed */
  leaving?: boolean
  /**
   * On a phone, pulled down to only its top, its name and what can be
   * done there, until it is pulled up (or tapped) for the rest
   */
  peek?: boolean
  /** Pulled up from a peek, or back down to one */
  onPeek?: (peek: boolean) => void
  onDirections: () => void
  onClose: () => void
}

/** How long "copied" shows on a button, in ms. */
const COPIED_MS = 1600

/** How fast, in px a ms, a flick takes a sheet on to its next height. */
const FLICK = 0.5

/**
 * How much of the screen a sheet takes as it opens, at most: as much as
 * its details need, short of this; pulled up, it shows the rest.
 */
const HALF = 0.46

/** The heights a sheet stands at, from the top down. */
type Detent = 'full' | 'half' | 'peek'

/** How tall a phone's home bar keeps the bottom, in px. */
function safeBottom() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;height:var(--safe-bottom)'
  document.body.append(probe)
  const px = probe.offsetHeight
  probe.remove()
  return px
}
/** A press that moves less than this, in px, is a tap. */
const TAP = 6

/** How far down the search box reaches over the map, in px. */
const SEARCH_BAR_PX = 76

/** Whether the panel is a sheet from the bottom, as on a phone. */
const isSheet = () => window.matchMedia('(max-width: 640px)').matches

const row = (i: number) => ({ '--row': i }) as CSSProperties

/**
 * A place in full, in a panel beside the map (a sheet from the bottom on a
 * phone): its name and kind, whether it is open now, a way there and a link
 * to share, then all OpenStreetMap knows of it: address, hours, phone,
 * website, cuisine and what it offers.
 */
export default function PlaceDetails({
  place,
  leaving = false,
  peek = false,
  onPeek,
  onDirections,
  onClose,
}: Props) {
  const theme = useTheme()
  const { current: ref } = useMap()
  const panel = useRef<HTMLElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const info = categoryInfo(place.categoryKey)
  const lookedUp = useAddress(place)
  // undefined while they are looked up, null when there are none
  const details = usePlaceDetails(place)
  const [week, setWeek] = useState(false)
  const [copied, setCopied] = useState<'link' | 'coordinates' | null>(null)
  // The time, to tell whether it is open; kept current while it is shown
  const now = useNow()
  // Where it was when the panel opened
  const openedAt = useRef(place.lngLat)
  // A pull on the sheet, under way: where it started, when, how far it has
  // gone, and how far down the sheet stood
  const pull = useRef<{
    from: number
    at: number
    by: number
    base: number
  } | null>(null)
  // On a phone, whether the sheet is pulled all the way up
  const [tall, setTall] = useState(false)
  const detent: Detent = peek ? 'peek' : tall ? 'full' : 'half'
  // How much of the sheet shows, in px: in a peek, down to its buttons;
  // as it opens, as much as its details need, up to a share of the screen
  const [heights, setHeights] = useState({ peek: 0, half: 0, more: false })
  const heightsRef = useRef(heights)
  const [lng, lat] = place.lngLat

  // Measured before it is first drawn, so the sheet comes up to the right
  // height; again as its details come in, and if the window changes
  useLayoutEffect(() => {
    const measure = () => {
      const row = actions.current
      const list = body.current
      const inner = content.current
      if (!row || !list || !inner) return
      const peekPx = Math.round(row.offsetTop + row.offsetHeight)
      const style = getComputedStyle(list)
      // All of it, as if there were room: down to its last line, and the
      // gap under that
      const needed = Math.round(
        list.offsetTop + parseFloat(style.paddingTop) + inner.offsetHeight + 14,
      )
      const cap = Math.round(window.innerHeight * HALF)
      const next = {
        peek: peekPx,
        half: Math.max(peekPx, Math.min(needed, cap)),
        more: needed > cap,
      }
      heightsRef.current = next
      setHeights((h) =>
        h.peek === next.peek && h.half === next.half && h.more === next.more
          ? h
          : next,
      )
    }
    measure()
    const watch = new ResizeObserver(measure)
    if (content.current) watch.observe(content.current)
    window.addEventListener('resize', measure)
    return () => {
      watch.disconnect()
      window.removeEventListener('resize', measure)
    }
    // Again as it goes to a peek, which has a button of its own
  }, [place.key, peek])

  // Escape closes it
  useEffect(() => {
    if (leaving) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [leaving, onClose])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  // Keep the place in sight: if the panel covers it, move the map so it
  // stands in the middle of what the panel leaves free
  useEffect(() => {
    const map = ref?.getMap()
    const rect = panel.current?.getBoundingClientRect()
    if (!map || !rect) return
    const frame = map.getContainer().getBoundingClientRect()
    // A sheet is still coming up: what it will cover once it is up
    const { peek: peekPx, half } = heightsRef.current
    const box = isSheet()
      ? new DOMRect(
          rect.left,
          frame.bottom - (peek ? peekPx : half),
          rect.width,
          rect.height,
        )
      : rect
    const point = map.project(openedAt.current)
    const [x, y] = [point.x + frame.left, point.y + frame.top]
    const margin = 32
    const covered =
      x > box.left - margin &&
      x < box.right + margin &&
      y > box.top - margin &&
      y < box.bottom + margin
    if (!covered) return
    // Beside the map on a wide screen; on a phone, over its lower part,
    // the place going between it and the search box
    const beside = box.width < frame.width * 0.75
    map.easeTo({
      center: openedAt.current,
      offset: beside
        ? [(box.right - frame.left) / 2, 0]
        : [0, (box.top - frame.bottom + SEARCH_BAR_PX) / 2],
      duration: 650,
    })
    // Only as it opens (the map stays the same): the reader may move the
    // map as they like after
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  const tags = details?.tags
  const address = (tags && tagAddress(tags)) ?? lookedUp
  const hours = tags?.opening_hours
  const parsed = hours ? parseOpeningHours(hours) : null
  const open = parsed && openState(parsed, now).open
  const call = tags && phone(tags)
  const site = tags && website(tags)
  const mail = tags && email(tags)
  const food = tags && cuisine(tags)
  const wiki = tags && wikipedia(tags)
  const offers = tags ? features(tags) : []
  const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  async function share() {
    if ((await sharePlace(place)) === 'copied') setCopied('link')
  }

  async function copyCoordinates() {
    await navigator.clipboard?.writeText(coordinates)
    setCopied('coordinates')
  }

  /** Takes the sheet to one of its heights, or closes it. */
  function goTo(to: Detent | 'closed') {
    if (to === 'closed') return onClose()
    if (to === 'peek') return onPeek?.(true)
    setTall(to === 'full')
    if (peek) onPeek?.(false)
  }

  // On a phone, the sheet follows a finger: it stands at three heights,
  // its top only, as much as its details need (as it opens), and all of
  // it, and goes to the nearest when let go, or on to the next one if
  // flicked; from its top only, down, it closes. A tap takes it up a
  // height. Below its full height its list doesn't scroll, so it can be
  // pulled by its list too. Only its transform moves, so it keeps up with
  // the finger.
  function onPullStart(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (!isSheet() || target.closest('button, a')) return
    if (detent === 'full' && target.closest('.place-panel-body')) return
    const sheet = event.currentTarget
    pull.current = {
      from: event.clientY,
      at: performance.now(),
      by: 0,
      // Where it stands now, its spring included
      base: new DOMMatrix(getComputedStyle(sheet).transform).m42,
    }
    sheet.setPointerCapture(event.pointerId)
    sheet.style.transition = 'none'
  }

  function onPull(event: PointerEvent<HTMLElement>) {
    const pulled = pull.current
    if (!pulled) return
    pulled.by = event.clientY - pulled.from
    // Past the top it gives only a little, as if held back
    const y = pulled.base + pulled.by
    const shown = y < 0 ? y / 4 : y
    event.currentTarget.style.transform = `translateY(${shown}px)`
  }

  function onPullEnd(event: PointerEvent<HTMLElement>) {
    const pulled = pull.current
    if (!pulled) return
    pull.current = null
    const sheet = event.currentTarget
    // Back to where its class puts it, springing from where it was let go
    sheet.style.transition = ''
    sheet.style.transform = ''
    const { peek: peekPx, half, more } = heightsRef.current
    const height = sheet.offsetHeight
    const bottom = safeBottom()
    // Each height, as how far down the sheet then stands
    const stops: [Detent | 'closed', number][] = [
      ...(more ? [['full', 0] as [Detent, number]] : []),
      ['half', height - half - bottom],
      ['peek', height - peekPx - bottom],
      ['closed', height],
    ]
    const at = stops.findIndex(([d]) => d === detent)
    if (Math.abs(pulled.by) < TAP) {
      if (at > 0) goTo(stops[at - 1][0])
      return
    }
    const speed = pulled.by / Math.max(1, performance.now() - pulled.at)
    if (speed > FLICK) return goTo(stops[Math.min(at + 1, stops.length - 1)][0])
    if (speed < -FLICK) return goTo(stops[Math.max(at - 1, 0)][0])
    const y = pulled.base + pulled.by
    const [nearest] = stops.reduce((a, b) =>
      Math.abs(b[1] - y) < Math.abs(a[1] - y) ? b : a,
    )
    goTo(nearest)
  }

  let i = 0
  return (
    <aside
      ref={panel}
      className={`place-panel mv-glass${leaving ? ' is-leaving' : ''}${
        peek ? ' is-peek' : ''
      }${detent === 'full' ? '' : ' is-part'}`}
      style={
        {
          '--shown': `${detent === 'peek' ? heights.peek : heights.half}px`,
        } as CSSProperties
      }
      aria-label={place.name}
      inert={leaving || undefined}
      onPointerDown={onPullStart}
      onPointerMove={onPull}
      onPointerUp={onPullEnd}
      onPointerCancel={onPullEnd}
    >
      <header className="place-panel-head">
        <CategoryBadge categoryKey={place.categoryKey} size={52} />
        <div className="place-panel-title">
          <h2>{place.name}</h2>
          {place.category && place.category !== place.name && (
            <p
              className="place-panel-kind"
              style={info && { color: labelColor(info.color, theme) }}
            >
              {place.category}
            </p>
          )}
          <div className="place-panel-status-slot">
            {details === undefined ? (
              <span className="place-skeleton-line place-panel-status-skeleton" />
            ) : (
              parsed && (
                <p
                  className={`place-panel-status ${open ? 'is-open' : 'is-closed'}`}
                >
                  {describeOpenState(parsed, now)}
                </p>
              )
            )}
          </div>
        </div>
        <button
          type="button"
          className="place-panel-close"
          aria-label="Ayrıntıları kapat"
          onClick={onClose}
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      <div ref={actions} className="place-panel-actions">
        <button type="button" className="is-primary" onClick={onDirections}>
          <Icon name="directions" size={18} />
          Yol tarifi
        </button>
        <button type="button" onClick={share}>
          <Icon name={copied === 'link' ? 'check' : 'share'} size={18} />
          {copied === 'link' ? 'Bağlantı kopyalandı' : 'Paylaş'}
        </button>
        {peek && (
          <button
            type="button"
            className="place-panel-more"
            aria-label="Ayrıntıları göster"
            title="Ayrıntıları göster"
            onClick={() => goTo('half')}
          >
            <Icon name="chevronDown" size={20} />
          </button>
        )}
      </div>

      <div ref={body} className="place-panel-body" inert={peek || undefined}>
        <div ref={content}>
          <ul className="place-facts">
            {address !== null && (
              <li style={row(i++)}>
                <Icon name="pin" size={20} />
                {address ? (
                  <span className="place-fact-text">{address}</span>
                ) : (
                  <span className="place-skeleton" role="status">
                    <span className="place-skeleton-hint">Adres aranıyor…</span>
                    <span />
                    <span />
                  </span>
                )}
              </li>
            )}
            {details === undefined &&
              [0, 1].map((k) => (
                <li key={`loading-${k}`} style={row(i++)} aria-hidden="true">
                  <span className="place-fact-icon-skeleton" />
                  <span className="place-skeleton">
                    <span />
                  </span>
                </li>
              ))}
            {hours && (
              <li style={row(i++)}>
                <Icon name="clock" size={20} />
                {parsed ? (
                  <div className="place-fact-text">
                    <button
                      type="button"
                      className="place-hours-toggle"
                      aria-expanded={week}
                      onClick={() => setWeek((w) => !w)}
                    >
                      <span>Bugün {dayHours(parsed[todayIndex(now)])}</span>
                      <Icon name="chevronDown" size={16} />
                    </button>
                    {week && (
                      <dl className="place-week">
                        {weekLines(parsed).map(({ days, hours }) => (
                          <div key={days}>
                            <dt>{days}</dt>
                            <dd>{hours}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                ) : (
                  <span className="place-fact-text">{hours}</span>
                )}
              </li>
            )}
            {call && (
              <li style={row(i++)}>
                <Icon name="phone" size={20} />
                <a className="place-fact-text" href={call.href}>
                  {call.number}
                </a>
              </li>
            )}
            {site && (
              <li style={row(i++)}>
                <Icon name="globe" size={20} />
                <a
                  className="place-fact-text"
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.label}
                </a>
              </li>
            )}
            {mail && (
              <li style={row(i++)}>
                <Icon name="mail" size={20} />
                <a className="place-fact-text" href={`mailto:${mail}`}>
                  {mail}
                </a>
              </li>
            )}
            {food && (
              <li style={row(i++)}>
                <Icon name="utensils" size={20} />
                <span className="place-fact-text">{food}</span>
              </li>
            )}
            {tags?.description && (
              <li style={row(i++)}>
                <Icon name="info" size={20} />
                <span className="place-fact-text">{tags.description}</span>
              </li>
            )}
            {wiki && (
              <li style={row(i++)}>
                <Icon name="external" size={20} />
                <a
                  className="place-fact-text"
                  href={wiki.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vikipedi: {wiki.label}
                </a>
              </li>
            )}
            <li style={row(i++)}>
              <Icon
                name={copied === 'coordinates' ? 'check' : 'copy'}
                size={20}
              />
              <button
                type="button"
                className="place-fact-text place-copy"
                onClick={copyCoordinates}
                title="Koordinatları kopyala"
              >
                {copied === 'coordinates' ? 'Kopyalandı' : coordinates}
              </button>
            </li>
          </ul>

          {offers.length > 0 && (
            <ul className="place-chips" aria-label="Olanaklar">
              {offers.map((offer, k) => (
                <li key={offer} style={row(i + k)}>
                  {offer}
                </li>
              ))}
            </ul>
          )}

          {details === null && (
            <p className="place-panel-note">
              OpenStreetMap'te bu yer için başka bilgi yok.
            </p>
          )}
          {details && (
            <p className="place-panel-note">
              Bilgiler OpenStreetMap katkıcılarından ·{' '}
              <a
                href={osmUrl(details)}
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenStreetMap'te gör
              </a>
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
