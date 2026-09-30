import { Layer, Source } from '@vis.gl/react-maplibre'
import { useMemo } from 'react'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS } from './catalog.ts'
import { landmarkExtrusions } from './landmarks.ts'

/**
 * Landmarks drawn with the map's own 3D extrusions, each where it stands,
 * in place of the map's plain buildings for it.
 */
export default function LandmarkExtrusions({
  beforeId,
}: {
  beforeId?: string
}) {
  const theme = useTheme()
  const data = useMemo(() => landmarkExtrusions(LANDMARKS, theme), [theme])

  return (
    <Source id="landmarks" type="geojson" data={data}>
      <Layer
        id="landmarks-3d"
        type="fill-extrusion"
        beforeId={beforeId}
        minzoom={13}
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
