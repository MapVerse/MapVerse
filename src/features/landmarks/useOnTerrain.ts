import { useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Polygon } from 'geojson'
import { useEffect, useState } from 'react'
import { useTerrainEnabled } from '../../map/terrainSetting.ts'
import { onTerrain } from './landmarks.ts'

/**
 * Landmark pieces set on the 3D terrain when it is on (see `onTerrain`),
 * once the ground's height has loaded, and again as finer heights come in.
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
    const settle = () => {
      if (!map.terrain) return
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
    settle()
    map.on('idle', settle)
    return () => {
      map.off('idle', settle)
    }
  }, [ref, terrain, pieces])
  return terrain && settled?.from === pieces ? settled.data : pieces
}
