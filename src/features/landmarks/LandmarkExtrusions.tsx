import { Layer, Source } from '@vis.gl/react-maplibre'
import { useMemo } from 'react'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS, landmarkExtrusions } from './landmarks.ts'

/** Landmarks drawn with the map's own 3D buildings: stacked rings. */
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
