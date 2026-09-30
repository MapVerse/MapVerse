import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import { useEffect, useMemo } from 'react'
import { useTheme } from '../../theme/theme.ts'
import {
  LANDMARKS,
  fallbackFor,
  findBuilding,
  landmarkExtrusions,
  type TileBuilding,
} from './landmarks.ts'
import { isPlaced, placeLandmark, usePlacedLandmarks } from './placement.ts'

/** Buildings are in the tiles from this zoom. */
const FIND_ZOOM = 13

/**
 * Landmarks drawn with the map's own 3D extrusions. Each is placed on its
 * building in the tiles, found once it comes into view.
 */
export default function LandmarkExtrusions({
  beforeId,
}: {
  beforeId?: string
}) {
  const { current: ref } = useMap()
  const theme = useTheme()
  const placed = usePlacedLandmarks()

  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    const look = () => {
      if (map.getZoom() < FIND_ZOOM) return
      const view = map.getBounds()
      const pending = LANDMARKS.filter(
        (landmark) => !isPlaced(landmark.id) && view.contains(landmark.near),
      )
      if (pending.length === 0) return
      const buildings = map.querySourceFeatures('openmaptiles', {
        sourceLayer: 'building',
      }) as TileBuilding[]
      for (const landmark of pending) {
        const found = findBuilding(landmark, buildings)
        if (found) placeLandmark(landmark, found)
        // Only give up on the tiles once they are all in, close up
        else if (map.getZoom() >= 14 && map.areTilesLoaded()) {
          placeLandmark(landmark, fallbackFor(landmark))
        }
      }
    }
    look()
    map.on('idle', look)
    return () => {
      map.off('idle', look)
    }
  }, [ref])

  const data = useMemo(
    () =>
      landmarkExtrusions(
        LANDMARKS.filter(({ id }) => placed[id]).map((landmark) => ({
          landmark,
          found: placed[landmark.id],
        })),
        theme,
      ),
    [placed, theme],
  )

  return (
    <Source id="landmarks" type="geojson" data={data}>
      <Layer
        id="landmarks-3d"
        type="fill-extrusion"
        beforeId={beforeId}
        minzoom={FIND_ZOOM}
        paint={{
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-vertical-gradient': true,
        }}
      />
    </Source>
  )
}
