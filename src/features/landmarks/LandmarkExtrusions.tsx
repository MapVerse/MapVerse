import { Layer, Source, useMap } from '@vis.gl/react-maplibre'
import type { FeatureCollection, Polygon } from 'geojson'
import { useEffect, useMemo, useState } from 'react'
import { useTerrainEnabled } from '../../map/terrainSetting.ts'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS } from './catalog.ts'
import { landmarkExtrusions, landmarkLights, onTerrain } from './landmarks.ts'

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
  const { current: ref } = useMap()
  const theme = useTheme()
  const terrain = useTerrainEnabled()
  const [ground, raised] = useMemo(() => {
    const { features } = landmarkExtrusions(LANDMARKS, theme)
    const collection = (
      keep: (height: number) => boolean,
    ): FeatureCollection<Polygon> => ({
      type: 'FeatureCollection',
      features: features.filter(({ properties }) => keep(properties!.height)),
    })
    return [collection((h) => h <= FLAT), collection((h) => h > FLAT)]
  }, [theme])

  // On the 3D terrain, set level on the ground's height, once that has
  // loaded, and again as finer heights come in
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
      const data = onTerrain(raised, (at) => {
        const h = map.queryTerrainElevation(at) ?? 0
        heights.push(Math.round(h * 2))
        return h
      })
      const key = heights.join()
      setSettled((last) =>
        last?.from === raised && last.key === key
          ? last
          : { from: raised, data, key },
      )
    }
    settle()
    map.on('idle', settle)
    return () => {
      map.off('idle', settle)
    }
  }, [ref, terrain, raised])
  const data = terrain && settled?.from === raised ? settled.data : raised

  return (
    <>
      <Source id="landmark-ground" type="geojson" data={ground}>
        <Layer
          id="landmark-paving"
          type="fill"
          // On the ground: over roads and parks, under the buildings
          beforeId="building"
          minzoom={13}
          paint={{ 'fill-color': ['get', 'color'] }}
        />
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
