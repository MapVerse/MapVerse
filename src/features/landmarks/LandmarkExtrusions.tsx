import { Layer, Source } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Polygon } from 'geojson'
import { useMemo } from 'react'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS } from './catalog.ts'
import { landmarkExtrusions, landmarkLights } from './landmarks.ts'
import { useOnTerrain } from './useOnTerrain.ts'

const LIGHTS = landmarkLights(LANDMARKS)

/** Pieces this low are paving, drawn flat so the night glow lies on them. */
const FLAT = 0.3

/**
 * Landmarks drawn with the map's own 3D extrusions, each where it stands,
 * in place of the map's plain buildings for it. At night their
 * floodlights and lamps throw a warm glow on the ground round them.
 */
export default function LandmarkExtrusions({
  beforeId,
}: {
  beforeId?: string
}) {
  const theme = useTheme()
  const [ground, raised, groundColors] = useMemo(() => {
    const { features } = landmarkExtrusions(LANDMARKS, theme)
    const collection = (
      keep: (height: number) => boolean,
    ): FeatureCollection<Polygon> => ({
      type: 'FeatureCollection',
      features: features.filter(({ properties }) => keep(properties!.height)),
    })
    const flat = collection((h) => h <= FLAT)
    const colors = [...new Set(flat.features.map((f) => f.properties!.color))]
    return [flat, collection((h) => h > FLAT), colors as string[]]
  }, [theme])

  const data = useOnTerrain(raised)

  return (
    <>
      <Source id="landmark-ground" type="geojson" data={ground}>
        {/* A colour a layer, as the map's own areas are drawn: so they
            share its shaders, rather than one being built for them when
            they first come into view, which stalls the map for a moment */}
        {groundColors.map((color, i) => (
          <Layer
            key={color}
            id={`landmark-paving-${i}`}
            type="fill"
            // On the ground: over roads and parks, under the buildings
            beforeId="building"
            minzoom={13}
            filter={['==', ['get', 'color'], color]}
            paint={{ 'fill-color': color }}
          />
        ))}
      </Source>
      {theme === 'dark' && (
        <Source id="landmark-lights" type="geojson" data={LIGHTS}>
          <Layer
            id="landmark-glow"
            type="heatmap"
            // On the ground and the paving, under the buildings
            beforeId="building"
            minzoom={13}
            paint={{
              // About 16 m round each light, at every zoom
              'heatmap-radius': [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                13,
                1.15,
                20,
                145,
              ],
              'heatmap-intensity': 1.3,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(255, 190, 110, 0)',
                0.2,
                'rgba(255, 190, 110, 0.28)',
                0.5,
                'rgba(255, 205, 140, 0.5)',
                1,
                'rgba(255, 230, 185, 0.72)',
              ],
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13,
                0,
                14.5,
                1,
              ],
            }}
          />
        </Source>
      )}
      <Source id="landmarks" type="geojson" data={data} maxzoom={16}>
        <Layer
          id="landmarks-3d"
          type="fill-extrusion"
          beforeId={beforeId}
          minzoom={13}
          paint={{
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-height': ['get', 'height'],
            // By day, darker towards the ground; floodlit at night, it is
            // the other way round, as the colours already show
            'fill-extrusion-vertical-gradient': theme === 'light',
          }}
        />
      </Source>
    </>
  )
}
