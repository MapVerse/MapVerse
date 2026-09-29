import { useMap } from '@vis.gl/react-maplibre'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { distanceMeters, formatDistance } from '../place/place.ts'
import { findMatch } from './match.ts'
import type { SearchResult } from './photon.ts'
import { MIN_QUERY_LENGTH, usePlaceSearch } from './usePlaceSearch.ts'
import { useRecentSearches } from './useRecentSearches.ts'
import './SearchBox.css'

type Props = {
  onSelect: (result: SearchResult) => void
  onClear: () => void
}

export default function SearchBox({ onSelect, onClear }: Props) {
  const { current: map } = useMap()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // Only search while the list is open, so picking a result doesn't refetch it
  const { results, status } = usePlaceSearch(open ? query : '')
  const { recent, addRecent } = useRecentSearches()
  const listId = useId()

  const trimmed = query.trim()
  const typed = open && trimmed.length >= MIN_QUERY_LENGTH
  const showRecent = open && trimmed === '' && recent.length > 0
  const items = showRecent ? recent : typed ? results : []
  const message =
    typed && status === 'error'
      ? 'Arama şu anda yapılamıyor.'
      : typed && status === 'done' && results.length === 0
        ? 'Sonuç bulunamadı.'
        : null
  const center = map?.getCenter().toArray()

  function select(result: SearchResult) {
    setQuery(result.name)
    setOpen(false)
    setActive(-1)
    addRecent(result)
    if (result.bbox) {
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
    inputRef.current?.focus()
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
      setOpen(false)
    }
  }

  return (
    <div className="search" role="search">
      <div className="search-field">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Yer veya adres ara"
          aria-autocomplete="list"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            items.length > 0 && active >= 0 ? `${listId}-${active}` : undefined
          }
          placeholder="Yer veya adres ara"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label="Aramayı temizle"
            onClick={clear}
          >
            ×
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div
          className="search-panel"
          // Keep focus in the input so the click below still lands
          onMouseDown={(event) => event.preventDefault()}
        >
          {showRecent && <p className="search-heading">Son aramalar</p>}
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
                <span className="search-text">
                  <span className="search-name">
                    <Highlight
                      text={item.name}
                      query={showRecent ? '' : trimmed}
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
