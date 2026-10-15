import { Popup, useMap } from '@vis.gl/react-maplibre'
import type { Popup as MapLibrePopup } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { useTheme } from '../../theme/theme.ts'
import { categoryInfo, labelColor } from './categories.ts'
import { tagAddress } from './details.ts'
import {
  describeOpenState,
  openState,
  parseOpeningHours,
} from './openingHours.ts'
import type { Place } from './place.ts'
import { sharePlace } from './share.ts'
import { useAddress } from './useAddress.ts'
import { useNow, usePlaceDetails } from './usePlaceDetails.ts'
import './PlaceCard.css'
import './PlaceBalloon.css'

type Props = {
  place: Place
  /** How far above the place the balloon's point stands, in px */
  lift: number
  /** On its way out, once closed */
  leaving?: boolean
  onDirections: () => void
  onDetails: () => void
  onClose: () => void
}

/**
 * How far from the map's edges a balloon is kept, in px: clear of the
 * search box above, the map's buttons on the right and the scale bar
 * below.
 */
const MARGIN = { top: 84, right: 72, bottom: 44, left: 24 }

/** How long the map takes to bring a balloon into view, in ms. */
const AUTO_PAN_MS = 500

/** How long "copied" shows on the share button, in ms. */
const COPIED_MS = 1600

const easeOut = (t: number) => 1 - (1 - t) ** 3

/** How far a span sticks out past [min, max]: < 0 before it, > 0 after. */
function overhang(low: number, high: number, min: number, max: number) {
  if (low < min) return low - min
  // Too big to fit, its start stays in view
  if (high > max) return Math.min(high - max, low - min)
  return 0
}

/**
 * A place opened with a click, as a balloon over it, as on Yandex Maps:
 * its name and kind, whether it is open now, its address, and a way
 * there, its details and a link to share. Always the same size, so what
 * comes in late (the address, the hours) changes no layout; it opens out
 * of its point and the map moves just enough to bring it in, if needed.
 */
export default function PlaceBalloon({
  place,
  lift,
  leaving = false,
  onDirections,
  onDetails,
  onClose,
}: Props) {
  const { current: ref } = useMap()
  const popup = useRef<MapLibrePopup>(null)
  const theme = useTheme()
  const info = categoryInfo(place.categoryKey)
  const lookedUp = useAddress(place)
  const details = usePlaceDetails(place)
  const now = useNow()
  const [copied, setCopied] = useState(false)
  const [lng, lat] = place.lngLat

  const tags = details?.tags
  const address = (tags && tagAddress(tags)) ?? lookedUp
  const hours = tags?.opening_hours
  const week = hours ? parseOpeningHours(hours) : null
  const kind =
    place.category && place.category !== place.name ? place.category : null

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
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  // Opening partly off the map, or under the search box or the map's
  // buttons, the map moves just enough to bring it in. Only as it opens:
  // the map is the reader's to move after.
  useEffect(() => {
    const map = ref?.getMap()
    const element = popup.current?.getElement()
    if (!map || !element) return
    const frame = map.getContainer().getBoundingClientRect()
    const box = element.getBoundingClientRect()
    const dx = overhang(
      box.left,
      box.right,
      frame.left + MARGIN.left,
      frame.right - MARGIN.right,
    )
    const dy = overhang(
      box.top,
      box.bottom,
      frame.top + MARGIN.top,
      frame.bottom - MARGIN.bottom,
    )
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.panBy([dx, dy], {
      duration: still ? 0 : AUTO_PAN_MS,
      easing: easeOut,
    })
  }, [ref])

  async function share() {
    if ((await sharePlace(place)) === 'copied') setCopied(true)
  }

  let status = null
  if (details === undefined) {
    status = <span className="balloon-status-skeleton" aria-hidden="true" />
  } else if (week) {
    const open = openState(week, now).open
    status = (
      <span className={`balloon-status ${open ? 'is-open' : 'is-closed'}`}>
        {describeOpenState(week, now)}
      </span>
    )
  }

  return (
    <Popup
      ref={popup}
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={lift}
      maxWidth="none"
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
      className={`place-balloon${leaving ? ' is-leaving' : ''}`}
    >
      <div
        className="balloon"
        role="dialog"
        aria-label={place.name}
        inert={leaving || undefined}
      >
        <header className="balloon-head">
          <div className="balloon-title">
            <h2>{place.name}</h2>
            <p className="balloon-kind">
              {kind && (
                <span
                  className="balloon-category"
                  style={info && { color: labelColor(info.color, theme) }}
                >
                  {kind}
                </span>
              )}
              {status}
            </p>
          </div>
          <button
            type="button"
            className="balloon-close"
            aria-label="Kapat"
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <p className="balloon-address">
          <Icon name="pin" size={15} />
          {address ? (
            <span className="balloon-address-text" title={address}>
              {address}
            </span>
          ) : address === null ? (
            <span className="balloon-address-text is-faint">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          ) : (
            <span className="balloon-address-skeleton" role="status">
              <span className="place-skeleton-hint">Adres aranıyor…</span>
            </span>
          )}
        </p>

        <div className="balloon-actions">
          <button type="button" className="is-primary" onClick={onDirections}>
            <Icon name="directions" size={17} />
            Yol tarifi
          </button>
          <button type="button" onClick={onDetails}>
            <Icon name="info" size={17} />
            Ayrıntılar
          </button>
          <button
            type="button"
            className="is-icon"
            aria-label={copied ? 'Bağlantı kopyalandı' : 'Paylaş'}
            title={copied ? 'Bağlantı kopyalandı' : 'Paylaş'}
            onClick={share}
          >
            <Icon name={copied ? 'check' : 'share'} size={17} />
          </button>
        </div>
      </div>
    </Popup>
  )
}
