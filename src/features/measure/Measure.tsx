import { Layer, Marker, Source, useMap } from '@vis.gl/react-maplibre'
import type { MapMouseEvent } from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import { useMediaQuery } from '../../lib/useMediaQuery.ts'
import { useMapDesign } from '../../map/designSetting.ts'
import { useTheme } from '../../theme/theme.ts'
import { isFreeEscape } from '../place/escape.ts'
import { formatDistance } from '../place/place.ts'
import { measureFeatures, pathLength, type LngLat } from './measure.ts'
import { setMeasuring } from './measureMode.ts'
import './Measure.css'

/** The line's colour, the interface's accent on each map. */
function lineColor(dark: boolean, sanAndreas: boolean) {
  if (sanAndreas) return '#ffd83a'
  return dark ? '#4c8df6' : '#2563eb'
}

/**
 * Measures a distance on the map: each click or tap adds a point, the
 * path through them is drawn with its points, which can be dragged, and
 * a small panel under the search box keeps the running total, with undo,
 * clear and close. Escape closes it, Backspace takes back the last point.
 */
export default function Measure() {
  const { current: map } = useMap()
  const theme = useTheme()
  const design = useMapDesign()
  const touch = useMediaQuery('(pointer: coarse)')
  const [points, setPoints] = useState<LngLat[]>([])
  const total = pathLength(points)
  const data = useMemo(() => measureFeatures(points), [points])
  const undo = () => setPoints((p) => p.slice(0, -1))

  // Clicks on the map add points; a quick second one adds another rather
  // than zooming in
  useEffect(() => {
    const m = map?.getMap()
    if (!m) return
    const onClick = (event: MapMouseEvent) => {
      const target = event.originalEvent.target
      // A point pressed or dragged is no new point
      if (target instanceof Element && target.closest('.measure-point')) return
      const at = event.lngLat.wrap().toArray()
      setPoints((p) => [...p, at])
    }
    const zoomsOnDoubleClick = m.doubleClickZoom.isEnabled()
    m.doubleClickZoom.disable()
    m.on('click', onClick)
    return () => {
      m.off('click', onClick)
      if (zoomsOnDoubleClick) m.doubleClickZoom.enable()
    }
  }, [map])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isFreeEscape(event)) {
        event.preventDefault()
        setMeasuring(false)
        return
      }
      const target = event.target
      const typing =
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable]')
      if (event.key === 'Backspace' && !typing) {
        event.preventDefault()
        setPoints((p) => p.slice(0, -1))
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const color = lineColor(theme === 'dark', design === 'san-andreas')
  const hint =
    points.length === 0
      ? `Ölçmek için haritada bir yere ${touch ? 'dokun' : 'tıkla'}`
      : points.length === 1
        ? `Sonraki noktaya ${touch ? 'dokun' : 'tıkla'}`
        : `${points.length} nokta · noktaları sürükleyerek taşı`

  return (
    <>
      <Source id="measure" type="geojson" data={data}>
        <Layer
          id="measure-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': design === 'san-andreas' ? '#000000' : '#ffffff',
            'line-width': 6,
            'line-opacity': 0.9,
          }}
        />
        <Layer
          id="measure-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{
            'line-color': color,
            'line-width': 3,
            'line-dasharray': [2, 1.2],
          }}
        />
      </Source>
      {points.map((point, i) => (
        <Marker
          // By place in the path: a dragged point keeps its marker
          key={i}
          longitude={point[0]}
          latitude={point[1]}
          draggable
          onDrag={(event) => {
            const at = event.lngLat.toArray() as LngLat
            setPoints((p) => p.map((q, j) => (j === i ? at : q)))
          }}
        >
          <span
            className={`measure-point${i === 0 ? ' is-first' : ''}`}
            style={{ color }}
          />
        </Marker>
      ))}
      <section className="measure mv-glass" aria-label="Mesafe ölç">
        <div className="measure-head">
          <Icon name="ruler" size={18} />
          <span className="measure-title">Mesafe ölç</span>
          <button
            type="button"
            className="measure-close"
            aria-label="Ölçmeyi kapat"
            title="Kapat (Esc)"
            onClick={() => setMeasuring(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <output className="measure-total" aria-live="polite">
          {points.length > 1 ? formatDistance(total) : '—'}
        </output>
        <p className="measure-hint">{hint}</p>
        <div className="measure-actions">
          <button
            type="button"
            disabled={points.length === 0}
            onClick={undo}
            title="Son noktayı geri al (Backspace)"
          >
            <Icon name="undo" size={18} />
            Geri al
          </button>
          <button
            type="button"
            disabled={points.length === 0}
            onClick={() => setPoints([])}
          >
            <Icon name="trash" size={18} />
            Temizle
          </button>
        </div>
      </section>
    </>
  )
}
