import { Marker, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useRef, useState } from 'react'
import { t, useLocale } from '../../i18n/index.ts'
import { Icon } from '../../icons/Icon.tsx'
import SaveButton from '../favorites/SaveButton.tsx'
import { describePoint, type PointDescription } from '../search/photon.ts'
import { copyText } from './clipboard.ts'
import { isFreeEscape } from './escape.ts'
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
  useLocale()
  const card = useRef<HTMLElement>(null)
  const here = usePointDescription(place.lngLat)
  // What was copied, or tried to be, and whether it was
  const [copied, setCopied] = useState<{
    what: 'link' | 'coordinates'
    ok: boolean
  } | null>(null)
  const [lng, lat] = place.lngLat
  const coordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const title =
    here?.title ?? (here === null ? t('common.selectedPoint') : undefined)

  // Escape closes it, unless something nearer takes it first
  useEffect(() => {
    if (leaving) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFreeEscape(event)) onClose()
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
    const shared = await sharePlace(place)
    if (shared === 'copied' || shared === 'failed') {
      setCopied({ what: 'link', ok: shared === 'copied' })
    }
  }

  async function copyCoordinates() {
    setCopied({ what: 'coordinates', ok: await copyText(coordinates) })
  }

  const linkCopied = copied?.what === 'link' ? copied : null
  const coordinatesCopied = copied?.what === 'coordinates' ? copied : null

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
        aria-label={title ?? t('common.selectedPoint')}
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
                <span className="place-skeleton-hint">
                  {t('common.findingAddress')}
                </span>
              </span>
            )}
            {here === undefined ? (
              <span className="point-card-skeleton" aria-hidden="true" />
            ) : (
              <p className="point-card-detail">
                {here?.detail || t('point.pickedOnMap')}
              </p>
            )}
            <button
              type="button"
              className="point-card-coordinates"
              title={t('common.copyCoordinates')}
              onClick={copyCoordinates}
              aria-live="polite"
            >
              {!coordinatesCopied
                ? coordinates
                : coordinatesCopied.ok
                  ? t('common.copied')
                  : t('common.copyFailed')}
              <Icon
                name={
                  !coordinatesCopied
                    ? 'copy'
                    : coordinatesCopied.ok
                      ? 'check'
                      : 'info'
                }
                size={14}
              />
            </button>
          </div>
          <button
            type="button"
            className="point-card-close"
            aria-label={t('common.close')}
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
              onDirections({
                ...place,
                name: title ?? t('common.selectedPoint'),
              })
            }
          >
            <Icon name="directions" size={17} />
            {t('common.directions')}
          </button>
          <button type="button" onClick={share} aria-live="polite">
            <Icon
              name={!linkCopied ? 'share' : linkCopied.ok ? 'check' : 'info'}
              size={17}
            />
            {!linkCopied
              ? t('common.share')
              : linkCopied.ok
                ? t('common.linkCopied')
                : t('common.copyFailed')}
          </button>
          <SaveButton
            place={{
              ...place,
              name: title ?? t('common.selectedPoint'),
              address: here?.detail || undefined,
            }}
            point
            compact
          />
        </div>
      </section>
    </>
  )
}
