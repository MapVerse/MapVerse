import { Marker, useMap } from '@vis.gl/react-maplibre'
import { useId, useState, type KeyboardEvent } from 'react'
import type { Place } from './photon.ts'
import { MIN_QUERY_LENGTH, usePlaceSearch } from './usePlaceSearch.ts'
import './SearchBox.css'

export default function SearchBox() {
  const { current: map } = useMap()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [selected, setSelected] = useState<Place | null>(null)
  // Only search while the list is open, so picking a result doesn't refetch it
  const { results, status } = usePlaceSearch(open ? query : '')
  const listId = useId()

  const typed = open && query.trim().length >= MIN_QUERY_LENGTH
  const message =
    typed && status === 'error'
      ? 'Arama şu anda yapılamıyor.'
      : typed && status === 'done' && results.length === 0
        ? 'Sonuç bulunamadı.'
        : null
  const showList = typed && results.length > 0

  function select(place: Place) {
    setSelected(place)
    setQuery(place.name)
    setOpen(false)
    setActive(-1)
    if (place.bbox) {
      map?.fitBounds(place.bbox, { padding: 60, maxZoom: 16 })
    } else {
      map?.flyTo({ center: place.lngLat, zoom: 16 })
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && showList) {
      select(results[active] ?? results[0])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <div className="search" role="search">
        <input
          type="search"
          role="combobox"
          aria-label="Yer veya adres ara"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={
            showList && active >= 0 ? `${listId}-${active}` : undefined
          }
          placeholder="Yer veya adres ara"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(-1)
            if (!event.target.value) setSelected(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="search-results"
            // Keep focus in the input so the click below still lands
            onMouseDown={(event) => event.preventDefault()}
          >
            {results.map((place, i) => (
              <li
                key={`${place.id}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => select(place)}
              >
                <span className="search-name">{place.name}</span>
                {place.detail && (
                  <span className="search-detail">{place.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {message && <p className="search-message">{message}</p>}
      </div>
      {selected && (
        <Marker
          longitude={selected.lngLat[0]}
          latitude={selected.lngLat[1]}
          color="#2563eb"
        />
      )}
    </>
  )
}
