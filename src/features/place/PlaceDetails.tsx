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

/**
 * How far, in px, or how fast, in px a ms, a sheet is pulled to go from
 * one height to the next: up from a peek to the whole of it, down from
 * there to a peek, and down from a peek to close.
 */
const PULL = 70
const FLICK = 0.5
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
  // How much of the sheet a peek shows, in px: down to its buttons
  const [peekPx, setPeekPx] = useState(0)
  const peekRef = useRef(0)
  const [lng, lat] = place.lngLat

  // Measured before it is first drawn, so the sheet comes up to the right
  // height; again if the window changes
  useLayoutEffect(() => {
    const measure = () => {
      const row = actions.current
      if (!row) return
      peekRef.current = Math.round(row.offsetTop + row.offsetHeight)
      setPeekPx(peekRef.current)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
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
    const box = isSheet()
      ? new DOMRect(
          rect.left,
          frame.bottom - (peek ? peekRef.current : rect.height),
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

  // On a phone, the sheet follows a finger on its top: pulled up from a
  // peek, it shows the rest; pulled down, it goes back to a peek, and
  // from a peek it closes. A tap on a peek opens it up too. Let go short
  // of the next height, and it springs back. Only its transform moves,
  // so it keeps up with the finger.
  function onPullStart(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (!isSheet() || target.closest('.place-panel-body, button, a')) return
    const sheet = event.currentTarget
    pull.current = {
      from: event.clientY,
      at: performance.now(),
      by: 0,
      base: peek ? sheet.offsetHeight - peekRef.current : 0,
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
    const speed = pulled.by / Math.max(1, performance.now() - pulled.at)
    const down = pulled.by > PULL || speed > FLICK
    const up = pulled.by < -PULL || speed < -FLICK
    // Back to where its class puts it, springing from where it was let go
    sheet.style.transition = ''
    sheet.style.transform = ''
    if (Math.abs(pulled.by) < TAP) {
      if (peek) onPeek?.(false)
    } else if (peek && up) {
      onPeek?.(false)
    } else if (peek && down) {
      onClose()
    } else if (!peek && down) {
      // Pulled far, it closes; else it goes back to a peek
      if (pulled.by > sheet.offsetHeight - peekRef.current + PULL) onClose()
      else onPeek?.(true)
    }
  }

  let i = 0
  return (
    <aside
      ref={panel}
      className={`place-panel mv-glass${leaving ? ' is-leaving' : ''}${
        peek ? ' is-peek' : ''
      }`}
      style={{ '--peek': `${peekPx}px` } as CSSProperties}
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
            onClick={() => onPeek?.(false)}
          >
            <Icon name="chevronDown" size={20} />
          </button>
        )}
      </div>

      <div className="place-panel-body" inert={peek || undefined}>
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
            <a href={osmUrl(details)} target="_blank" rel="noopener noreferrer">
              OpenStreetMap'te gör
            </a>
          </p>
        )}
      </div>
    </aside>
  )
}
