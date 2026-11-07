import { useMap } from '@vis.gl/react-maplibre'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { onMap, swallowNextClick } from '../../lib/swallowClick.ts'
import { HOVER_QUERY, useMediaQuery } from '../../lib/useMediaQuery.ts'
import {
  KIND_ICONS,
  favoriteDetail,
  favoritePlace,
  favoriteTitle,
  type Favorite,
} from '../favorites/favorites.ts'
import { useFavorites } from '../favorites/useFavorites.ts'
import CategoryBadge from '../place/CategoryBadge.tsx'
import { distanceMeters, formatDistance } from '../place/place.ts'
import { matchCategory, nearbyLabel } from './categoryQuery.ts'
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
  /**
   * A category to search for as the app starts (a home screen shortcut):
   * around the map, or with `locate`, around the device, if it will say
   */
  startCategory?: { category: QuickCategory; locate: boolean }
}

/** A row of the list under the box. */
type Row =
  /** A category the typed text names, to search nearby */
  | { type: 'category'; category: QuickCategory }
  /** A saved place, or a recent search, while the box is empty */
  | { type: 'saved'; favorite: Favorite; result: SearchResult }
  | { type: 'recent'; result: SearchResult }
  /** A place found for the typed text, or nearby in a category */
  | { type: 'result'; result: SearchResult }

/** The parts of the list, each under its own heading. */
const SECTIONS = [
  { part: 'saved', heading: 'Kayıtlı yerler' },
  { part: 'recent', heading: 'Son aramalar' },
  { part: 'found', heading: '' },
] as const

const partOf = (row: Row) =>
  row.type === 'saved' || row.type === 'recent' ? row.type : 'found'

/** How many saved places the box lists; all are in the profile menu. */
const SAVED_LIMIT = 6

/** How long to wait for the device to say where it is, in ms. */
const LOCATE_MS = 8000

/** Whether a key press is typing, in a field or the like, not a shortcut. */
function isTyping(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest('input, textarea, select, [contenteditable]')
  )
}

const savedRow = (favorite: Favorite): Row => ({
  type: 'saved',
  favorite,
  result: { ...favoritePlace(favorite), detail: favoriteDetail(favorite) },
})

export default function SearchBox({
  hidden,
  onSelect,
  onClear,
  onDirections,
  nearby,
  onCategory,
  startCategory,
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
  const favorites = useFavorites()
  const listId = useId()
  // On a narrow phone the full hint would be cut off
  const narrow = useMediaQuery('(max-width: 440px)')
  const canHover = useMediaQuery(HOVER_QUERY)

  const trimmed = query.trim()
  const typed = open && !nearby && trimmed.length >= MIN_QUERY_LENGTH
  const showCategories = open && trimmed === ''
  // A category the text names comes first, as soon as it is typed
  const named = open && !nearby ? matchCategory(trimmed) : undefined
  const items: Row[] = nearby
    ? open
      ? nearby.results.map((result) => ({ type: 'result', result }))
      : []
    : showCategories
      ? [
          ...favorites.slice(0, SAVED_LIMIT).map(savedRow),
          ...recent.map((result): Row => ({ type: 'recent', result })),
        ]
      : [
          ...(named ? [{ type: 'category', category: named } as const] : []),
          ...(typed
            ? results.map((result): Row => ({ type: 'result', result }))
            : []),
        ]
  // The list in its parts, numbered through as one
  const sections = SECTIONS.map((section) => ({
    ...section,
    rows: items
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => partOf(row) === section.part),
  })).filter((section) => section.rows.length > 0)
  // The highlighted row, kept within the list as it shrinks
  const current = Math.min(active, items.length - 1)
  // The panel under the box: the categories, or a list
  const popup = showCategories || items.length > 0
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
        : typed && status === 'done' && items.length === 0
          ? 'Sonuç bulunamadı.'
          : null
  // While the box is in use, a press on the map only puts it away (and a
  // phone's keyboard with it): it doesn't also open what is under it
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (onMap(event.target)) swallowNextClick()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // "/" goes to the box, as on many sites, unless typing somewhere already
  useEffect(() => {
    if (hidden) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey)
        return
      if (event.defaultPrevented || isTyping(event.target)) return
      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [hidden])

  // A category asked for as the app starts: around the device where it
  // says where it is, else around the map, which a link may have placed
  const started = useRef(false)
  useEffect(() => {
    if (!startCategory || !map || started.current) return
    started.current = true
    const { category, locate } = startCategory
    const begin = (center: [number, number]) => {
      setQuery(category.label)
      setActive(-1)
      onCategory({ category, center })
      // The list opens only where no keyboard comes up over it
      if (canHover) {
        setOpen(true)
        inputRef.current?.focus({ preventScroll: true })
      }
    }
    if (!locate || !navigator.geolocation) {
      begin(map.getCenter().toArray())
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here: [number, number] = [coords.longitude, coords.latitude]
        map.jumpTo({ center: here, zoom: Math.max(map.getZoom(), 14) })
        begin(here)
      },
      () => begin(map.getCenter().toArray()),
      { timeout: LOCATE_MS, maximumAge: 300_000 },
    )
  }, [startCategory, map, canHover, onCategory])

  // Nearby results are measured from where they were searched around
  const center = nearby?.center ?? map?.getCenter().toArray()

  /** Opens a row: a place, or a search for a category. */
  function choose(row: Row) {
    if (row.type === 'category') pickCategory(row.category)
    else select(row.result, row.type !== 'saved')
  }

  function select(result: SearchResult, remember = true) {
    // A category's name stays in the box, and its results on the map
    if (!nearby) setQuery(result.name)
    setOpen(false)
    setActive(-1)
    if (remember) addRecentSearch(result)
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
    if (!showCategories && items.length > 0) {
      choose(items[current] ?? items[0])
    } else {
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive(Math.min(current + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && items.length > 0) {
      // While the box is empty, only a row picked with the arrows opens
      if (showCategories && current < 0) return
      choose(items[current] ?? items[0])
    } else if (event.key === 'Escape' && (popup || message)) {
      // Only close the list; a search box would also clear its text. Taken
      // here, it closes nothing else, such as an open place
      event.preventDefault()
      event.stopPropagation()
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
          aria-expanded={popup}
          // Only while the list is there to point to
          aria-controls={
            sections.length > 0
              ? sections.map(({ part }) => `${listId}-${part}`).join(' ')
              : undefined
          }
          aria-activedescendant={
            current >= 0 ? `${listId}-${current}` : undefined
          }
          placeholder={narrow ? 'Burada ara' : 'Arama ve yer seçimi'}
          aria-keyshortcuts="/"
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
      {popup && (
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
              {QUICK_CATEGORIES.map((category, i) => (
                <button
                  key={category.key}
                  style={{ '--row': i } as CSSProperties}
                  type="button"
                  onClick={() => pickCategory(category)}
                >
                  <CategoryBadge categoryKey={category.key} size={26} />
                  {category.label}
                </button>
              ))}
            </div>
          )}
          {sections.length > 0 && (
            <div className="search-lists">
              {sections.map(({ part, heading, rows }) => (
                <div key={part}>
                  {heading && <p className="search-heading">{heading}</p>}
                  <ul
                    id={`${listId}-${part}`}
                    role="listbox"
                    aria-label={heading || 'Arama sonuçları'}
                    className="search-results"
                  >
                    {rows.map(({ row, index: i }) => (
                      <li
                        key={rowKey(row, i)}
                        id={`${listId}-${i}`}
                        // The rows come in one after another
                        style={{ '--row': Math.min(i, 8) } as CSSProperties}
                        role="option"
                        aria-selected={i === current}
                        onClick={() => choose(row)}
                      >
                        <RowContent
                          row={row}
                          query={nearby ? '' : trimmed}
                          center={center}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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

const rowKey = (row: Row, i: number) =>
  `${row.type}:${row.type === 'category' ? row.category.key : row.result.key}-${i}`

/** What a row of the list shows: an icon, a name and a line under it. */
function RowContent({
  row,
  query,
  center,
}: {
  row: Row
  query: string
  center: [number, number] | undefined
}) {
  if (row.type === 'category') {
    return (
      <>
        <CategoryBadge categoryKey={row.category.key} size={36} />
        <span className="search-text">
          <span className="search-name">{nearbyLabel(row.category)}</span>
          <span className="search-detail">En yakınları haritada göster</span>
        </span>
        <span className="search-distance">
          <Icon name="search" size={18} />
        </span>
      </>
    )
  }
  const { result } = row
  return (
    <>
      {row.type === 'saved' ? (
        <span
          className={`search-recent-icon search-saved-icon is-${row.favorite.kind}`}
        >
          <Icon name={KIND_ICONS[row.favorite.kind]} size={18} />
        </span>
      ) : row.type === 'recent' ? (
        <span className="search-recent-icon">
          <Icon name="clock" size={18} />
        </span>
      ) : (
        <CategoryBadge categoryKey={result.categoryKey} size={36} />
      )}
      <span className="search-text">
        <span className="search-name">
          {row.type === 'saved' ? (
            favoriteTitle(row.favorite)
          ) : (
            <Highlight
              text={result.name}
              query={row.type === 'recent' ? '' : query}
            />
          )}
        </span>
        {result.detail && (
          <span className="search-detail">{result.detail}</span>
        )}
      </span>
      {center && (
        <span className="search-distance">
          {formatDistance(distanceMeters(center, result.lngLat))}
        </span>
      )}
    </>
  )
}
