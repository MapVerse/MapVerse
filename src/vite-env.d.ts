/// <reference types="vite/client" />

// Set at build time; see "Ortam değişkenleri" in the README
interface ImportMetaEnv {
  readonly VITE_PHOTON_URL?: string
  readonly VITE_NOMINATIM_URL?: string
  /** Comma-separated, tried in turn */
  readonly VITE_OVERPASS_URLS?: string
  readonly VITE_VALHALLA_URL?: string
  /** Where to POST error reports; none are sent without it */
  readonly VITE_ERROR_REPORT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json's version, put in by vite.config.ts */
declare const __APP_VERSION__: string
/** The commit the app was built from, short, or "dev" */
declare const __APP_COMMIT__: string
/** When the app was built, as an ISO date */
declare const __APP_BUILT__: string
