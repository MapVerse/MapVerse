import { useMap } from '@vis.gl/react-maplibre'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import CategoryBadge from '../place/CategoryBadge.tsx'
import { distanceMeters, formatDistance } from '../place/place.ts'
import { findMatch } from './match.ts'
import { QUICK_CATEGORIES, type QuickCategory } from './overpass.ts'
import type { SearchResult } from './photon.ts'
import type { CategoryResults, CategorySearch } from './useCategorySearch.ts'
import { MIN_QUERY_LENGTH, usePlaceSearch } from './usePlaceSearch.ts'
import { addRecentSearch, useRecentSearches } from './useRecentSearches.ts'
import './SearchBox.css'

type Props = {
  hidden?: boolean
  onSelect: (result: SearchResult) => void
  onClear: () => void
  /** Opens directions, to the selected place if there is one */
  onDirections: () => void
  /** The category search under way, with its results */
  nearby: (CategorySearch & CategoryResults) | null
  /** Starts a search for a category nearby, or ends it with null */
  onCategory: (search: CategorySearch | null) => void
}

export default function SearchBox({
  hidden,
  onSelect,
  onClear,
  onDirections,
  nearby,
  onCategory,
}: Props) {
  const { current: map } = useMap()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // Only search while the list is open, so picking a result doesn't refetch it,
  // and not while the box shows a category's name
  const { results, status } = usePlaceSearch(open && !nearby ? query : '')
  const recent = useRecentSearches()
  const listId = useId()

  const trimmed = query.trim()
  const typed = open && !nearby && trimmed.length >= MIN_QUERY_LENGTH
  const showCategories = open && trimmed === ''
  const showRecent = showCategories && recent.length > 0
  const items = nearby
    ? open
      ? nearby.results
      : []
    : showRecent
      ? recent
      : typed
        ? results
        : []
  const message = !open
    ? null
    : nearby
      ? nearby.status === 'loading'
        ? 'Yakındaki yerler aranıyor…'
        : nearby.status === 'error'
          ? 'Arama şu anda yapılamıyor.'
          : nearby.status === 'done' && nearby.results.length === 0
            ? 'Yakında bu türde bir yer bulunamadı.'
            : null
      : typed && status === 'error'
        ? 'Arama şu anda yapılamıyor.'
        : typed && status === 'done' && results.length === 0
          ? 'Sonuç bulunamadı.'
          : null
  // Nearby results are measured from where they were searched around
  const center = nearby?.center ?? map?.getCenter().toArray()

  function select(result: SearchResult) {
    // A category's name stays in the box, and its results on the map
    if (!nearby) setQuery(result.name)
    setOpen(false)
    setActive(-1)
    addRecentSearch(result)
    if (nearby) {
      map?.easeTo({ center: result.lngLat, zoom: Math.max(map.getZoom(), 15) })
    } else if (result.bbox) {
      map?.fitBounds(result.bbox, {
        padding: { top: 80, right: 60, bottom: 40, left: 40 },
        maxZoom: 17,
      })
    } else {
      map?.flyTo({ center: result.lngLat, zoom: 17 })
    }
    onSelect(result)
  }

  function clear() {
    setQuery('')
    setActive(-1)
    onClear()
    onCategory(null)
    inputRef.current?.focus()
  }

  function pickCategory(category: QuickCategory) {
    const around = map?.getCenter().toArray()
    if (!around) return
    setQuery(category.label)
    setActive(-1)
    setOpen(true)
    onClear()
    onCategory({ category, center: around })
  }

  /** The search button picks the highlighted result, or opens the list. */
  function search() {
    if (!showRecent && items.length > 0) {
      select(items[active] ?? items[0])
    } else {
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && items.length > 0) {
      select(items[active] ?? items[0])
    } else if (event.key === 'Escape') {
      // Only close the list; a search box would also clear its text
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div
      className="search mv-glass"
      role="search"
      hidden={hidden}
      // Stay open while focus moves between the box's own controls
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="search-field">
        <img
          className="search-logo"
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
          width={28}
          height={28}
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Arama ve yer seçimi"
          aria-autocomplete="list"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            items.length > 0 && active >= 0 ? `${listId}-${active}` : undefined
          }
          placeholder="Arama ve yer seçimi"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(-1)
            // Typing over a category's name starts an ordinary search
            if (nearby) onCategory(null)
            // Emptying the box drops the selected place, like the clear button
            if (!event.target.value) onClear()
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="search-action search-clear"
            aria-label="Aramayı temizle"
            onClick={clear}
          >
            <Icon name="close" size={18} />
          </button>
        )}
        <button
          type="button"
          className="search-action"
          aria-label="Ara"
          title="Ara"
          // Keep focus in the box so the open list is still there on click
          onMouseDown={(event) => event.preventDefault()}
          onClick={search}
        >
          <Icon name="search" size={22} strokeWidth={1.9} />
        </button>
        <span className="search-divider" />
        <button
          type="button"
          className="search-action"
          aria-label="Yol tarifi"
          title="Yol tarifi"
          onClick={onDirections}
        >
          <Icon name="route" size={22} strokeWidth={1.9} />
        </button>
      </div>
      {(showCategories || items.length > 0) && (
        <div
          className="search-panel"
          // Keep focus in the input so the click below still lands
          onMouseDown={(event) => event.preventDefault()}
        >
          {showCategories && (
            <div
              className="search-categories"
              role="group"
              aria-label="Yakındakiler"
              // Let a mouse wheel scroll the row sideways
              onWheel={(event) => {
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                  event.currentTarget.scrollLeft += event.deltaY
                }
              }}
            >
              {QUICK_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => pickCategory(category)}
                >
                  <CategoryBadge categoryKey={category.key} size={26} />
                  {category.label}
                </button>
              ))}
            </div>
          )}
          {showRecent && <p className="search-heading">Son aramalar</p>}
          {items.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={showRecent ? 'Son aramalar' : 'Arama sonuçları'}
              className="search-results"
            >
              {items.map((item, i) => (
                <li
                  key={`${item.key}-${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => select(item)}
                >
                  {showRecent ? (
                    <span className="search-recent-icon">
                      <Icon name="clock" size={18} />
                    </span>
                  ) : (
                    <CategoryBadge categoryKey={item.categoryKey} size={36} />
                  )}
                  <span className="search-text">
                    <span className="search-name">
                      <Highlight
                        text={item.name}
                        query={showRecent || nearby ? '' : trimmed}
                      />
                    </span>
                    {item.detail && (
                      <span className="search-detail">{item.detail}</span>
                    )}
                  </span>
                  {center && (
                    <span className="search-distance">
                      {formatDistance(distanceMeters(center, item.lngLat))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {message && <p className="search-message">{message}</p>}
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }) {
  const match = findMatch(text, query)
  if (!match) return text
  const [start, end] = match
  return (
    <>
      {text.slice(0, start)}
      <strong>{text.slice(start, end)}</strong>
      {text.slice(end)}
    </>
  )
}
