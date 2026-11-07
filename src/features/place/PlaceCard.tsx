import { Popup } from '@vis.gl/react-maplibre'
import { t, useLocale } from '../../i18n/index.ts'
import { Icon } from '../../icons/Icon.tsx'
import { useTheme } from '../../theme/theme.ts'
import { categoryInfo, labelColor } from './categories.ts'
import CategoryBadge from './CategoryBadge.tsx'
import { placeCategory, type Place } from './place.ts'
import { useAddress } from './useAddress.ts'
import './PlaceCard.css'

type Props = {
  place: Place
  offset: number
  /** On its way out, shrinking back into its place */
  leaving?: boolean
}

/**
 * A glance at a place, shown while the pointer rests on it: its name, kind
 * and address. A click opens its details.
 */
export default function PlaceCard({ place, offset, leaving = false }: Props) {
  const [lng, lat] = place.lngLat
  const address = useAddress(place)
  const info = categoryInfo(place.categoryKey)
  const theme = useTheme()
  useLocale()
  const category = placeCategory(place)

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={offset}
      maxWidth="300px"
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
      className={`place-card${leaving ? ' is-leaving' : ''}`}
    >
      <div className="place-header">
        <CategoryBadge categoryKey={place.categoryKey} size={38} />
        <div className="place-title">
          <h2 className="place-name">{place.name}</h2>
          {category && category !== place.name && (
            <p
              className="place-category"
              style={info && { color: labelColor(info.color, theme) }}
            >
              {category}
            </p>
          )}
        </div>
      </div>
      {/* While the address is looked up, a shimmering outline of it; if there
          turns out to be none, the row folds away */}
      <div
        className={`place-address-row${address === null ? ' is-empty' : ''}`}
      >
        <div>
          <p className="place-address" aria-busy={!address}>
            <Icon name="pin" size={16} />
            {address ? (
              <span className="place-address-text">{address}</span>
            ) : (
              <span className="place-skeleton" role="status">
                <span className="place-skeleton-hint">
                  {t('common.findingAddress')}
                </span>
                <span />
                <span />
              </span>
            )}
          </p>
        </div>
      </div>
      <p className="place-hint">{t('place.clickForDetails')}</p>
    </Popup>
  )
}
