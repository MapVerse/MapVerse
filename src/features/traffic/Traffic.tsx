import { Layer, Source, useControl, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons/Icon.tsx'
import {
  TRAFFIC_LAYERS,
  TRAFFIC_REFRESH_MS,
  TRAFFIC_SOURCE_ID,
  trafficSource,
} from './traffic.ts'
import './Traffic.css'

type Props = {
  apiKey: string
  /** Style layer to draw traffic beneath, so labels stay readable */
  beforeId?: string
}

/** A map button that shows live traffic from TomTom, kept fresh while on. */
export default function Traffic({ apiKey, beforeId }: Props) {
  const { current: map } = useMap()
  const [on, setOn] = useState(false)
  const [container] = useState(() => {
    const element = document.createElement('div')
    element.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    return element
  })
  useControl(
    () => ({ onAdd: () => container, onRemove: () => container.remove() }),
    { position: 'top-right' },
  )

  useEffect(() => {
    if (!on || !map) return
    const timer = setInterval(
      () => map.getMap().refreshTiles(TRAFFIC_SOURCE_ID),
      TRAFFIC_REFRESH_MS,
    )
    return () => clearInterval(timer)
  }, [on, map])

  return (
    <>
      {createPortal(
        <button
          type="button"
          className="traffic-toggle"
          title="Trafik"
          aria-label="Trafik"
          aria-pressed={on}
          onClick={() => setOn((value) => !value)}
        >
          <Icon name="traffic" size={20} />
        </button>,
        container,
      )}
      {on && (
        <>
          <Source id={TRAFFIC_SOURCE_ID} {...trafficSource(apiKey)}>
            {TRAFFIC_LAYERS.map((layer) => (
              <Layer key={layer.id} {...layer} beforeId={beforeId} />
            ))}
          </Source>
          <div
            className="traffic-legend"
            role="note"
            aria-label="Trafik renkleri"
          >
            <span>Akıcı</span>
            <span className="traffic-legend-bar" />
            <span>Yoğun</span>
          </div>
        </>
      )}
    </>
  )
}
