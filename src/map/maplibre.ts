import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// maplibre-gl v6 looks for its worker next to its own module file, which no
// longer exists once Vite bundles it, so hand it a Vite-built worker instead.
export const maplibre = import('maplibre-gl').then((lib) => {
  lib.setWorkerUrl(workerUrl)
  return lib
})
