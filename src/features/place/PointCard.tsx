import { Marker, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { describePoint, type PointDescription } from '../search/photon.ts'
import type { Place } from './place.ts'
import { sharePlace } from './share.ts'
import './PlaceCard.css'
import './PointCard.css'

type Props = {
  /** The point clicked */
  place: Place
  /** On its way out, once closed */
  leaving?: boolean
  /** A way there, the point named by what was found at it */
  onDirections: (to: Place) => void
  onClose: () => void
}

/** How long "copied" shows, in ms. */
const COPIED_MS = 1600

/** How far over the card the point is kept, once the map has moved, in px. */
const CLEARANCE = 56

// What was found at points already looked up, by where
const known = new Map<string, PointDescription | null>()

/** What is at a point: undefined while it is looked up, null if nothing. */
function usePointDescription(
  lngLat: [number, number],
): PointDescription | null | undefined {
  const at = lngLat.join()
  const [found, setFound] = useState<{
    at: string
    here: PointDescription | null
  }>()
  useEffect(() => {
    if (known.has(at)) return
    const controller = new AbortController()
    describePoint(lngLat, controller.signal)
      .then((here) => {
        known.set(at, here)
        setFound({ at, here })
      })
      .catch(() => {
        if (!controller.signal.aborted) setFound({ at, here: null })
      })
    return () => controller.abort()
  }, [at, lngLat])
  return found?.at === at ? found.here : known.get(at)
}

/**
 * A point on the map clicked where there is no place, as on Google Maps:
 * a pin drops onto it and a card comes up at the bottom with what is
 * there (its address, down to the city) and where it is, to copy, with a
 * way there and a link to share. Always the same size, so the address
 * coming in moves nothing.
 */
export default function PointCard({
  place,
  leaving = false,
  onDirections,
  onClose,
}: Props) {
  const { current: ref } = useMap()
  const card = useRef<HTMLElement>(null)
  const here = usePointDescription(place.lngLat)
  const [copied, setCopied] = useState<'link' | 'coordinates' | null>(null)
  const [lng, lat] = place.lngLat
  const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const title = here?.title ?? (here === null ? 'Seçilen nokta' : undefined)

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

  // Clicked low on the map, the point would be under the card: the map
  // moves it up clear of it. Only as it opens.
  useEffect(() => {
    const map = ref?.getMap()
    const box = card.current?.getBoundingClientRect()
    if (!map || !box) return
    const frame = map.getContainer().getBoundingClientRect()
    const { x, y } = map.project(place.lngLat)
    const top = box.top - frame.top
    const beside =
      x < box.left - frame.left - 24 || x > box.right - frame.left + 24
    if (beside || y < top - CLEARANCE) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.panBy([0, y - (top - CLEARANCE)], { duration: still ? 0 : 450 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  async function share() {
    if ((await sharePlace(place)) === 'copied') setCopied('link')
  }

  async function copyCoordinates() {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(coordinates)
    setCopied('coordinates')
  }

  return (
    <>
      <Marker
        longitude={lng}
        latitude={lat}
        anchor="bottom"
        style={{ zIndex: 1, pointerEvents: 'none' }}
      >
        <span className={`point-pin${leaving ? ' is-leaving' : ''}`}>
          <span className="point-pin-ground" />
          <span className="point-pin-head" />
        </span>
      </Marker>

      <section
        ref={card}
        className={`point-card${leaving ? ' is-leaving' : ''}`}
        aria-label={title ?? 'Seçilen nokta'}
        inert={leaving || undefined}
      >
        <div className="point-card-main">
          <span className="point-card-icon">
            <Icon name="pin" size={20} />
          </span>
          <div className="point-card-text">
            {title ? (
              <h2 title={title}>{title}</h2>
            ) : (
              <span className="point-card-skeleton is-title" role="status">
                <span className="place-skeleton-hint">Adres aranıyor…</span>
              </span>
            )}
            {here === undefined ? (
              <span className="point-card-skeleton" aria-hidden="true" />
            ) : (
              <p className="point-card-detail">
                {here?.detail || 'Haritada seçilen nokta'}
              </p>
            )}
            <button
              type="button"
              className="point-card-coordinates"
              title="Koordinatları kopyala"
              onClick={copyCoordinates}
            >
              {copied === 'coordinates' ? 'Kopyalandı' : coordinates}
              <Icon
                name={copied === 'coordinates' ? 'check' : 'copy'}
                size={14}
              />
            </button>
          </div>
          <button
            type="button"
            className="point-card-close"
            aria-label="Kapat"
            onClick={onClose}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="point-card-actions">
          <button
            type="button"
            className="is-primary"
            onClick={() =>
              onDirections({ ...place, name: title ?? 'Seçilen nokta' })
            }
          >
            <Icon name="directions" size={17} />
            Yol tarifi
          </button>
          <button type="button" onClick={share}>
            <Icon name={copied === 'link' ? 'check' : 'share'} size={17} />
            {copied === 'link' ? 'Bağlantı kopyalandı' : 'Paylaş'}
          </button>
        </div>
      </section>
    </>
  )
}
