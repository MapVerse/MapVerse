import { useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Polygon } from 'geojson'
import type { MapSourceDataEvent } from 'maplibre-gl'
import { useEffect, useState } from 'react'
import { useTerrainEnabled } from '../../map/terrainSetting.ts'
import { onTerrain } from './landmarks.ts'

/**
 * Landmark pieces set on the 3D terrain when it is on (see `onTerrain`),
 * once the ground's height has loaded, and again as finer heights come in:
 * only then, as settling them all takes a while.
 */
export function useOnTerrain(
  pieces: FeatureCollection<Polygon>,
): FeatureCollection<Polygon> {
  const { current: ref } = useMap()
  const terrain = useTerrainEnabled()
  const [settled, setSettled] = useState<{
    from: FeatureCollection<Polygon>
    data: FeatureCollection<Polygon>
    key: string
  }>()
  useEffect(() => {
    const map = ref?.getMap()
    if (!map || !terrain) return
    let stale = true
    const settle = () => {
      if (!stale || !map.terrain) return
      stale = false
      const heights: number[] = []
      const data = onTerrain(pieces, (at) => {
        const h = map.queryTerrainElevation(at) ?? 0
        heights.push(Math.round(h * 2))
        return h
      })
      const key = heights.join()
      setSettled((last) =>
        last?.from === pieces && last.key === key
          ? last
          : { from: pieces, data, key },
      )
    }
    // New heights for the ground, for the pieces to settle on when the map
    // is next still
    const heights = ({ sourceId, tile }: MapSourceDataEvent) => {
      if (tile && sourceId === map.getTerrain()?.source) stale = true
    }
    settle()
    map.on('sourcedata', heights)
    map.on('idle', settle)
    return () => {
      map.off('sourcedata', heights)
      map.off('idle', settle)
    }
  }, [ref, terrain, pieces])
  return terrain && settled?.from === pieces ? settled.data : pieces
}
