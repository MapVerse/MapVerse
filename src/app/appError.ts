/** What kind of failure stopped the app, for what to tell the user. */
export type AppErrorKind = 'webgl' | 'load' | 'other'

/** A failure that stops the map from starting, as the map reports it. */
export class MapStartError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.name = 'MapStartError'
  }
}

/**
 * How browsers word a script that could not be fetched: offline, or a
 * chunk gone once a newer version of the app was put up.
 */
const LOAD_FAILED =
  /dynamically imported module|module script failed|loading chunk|failed to fetch|networkerror|load failed/i

export function errorKind(error: unknown): AppErrorKind {
  const cause = error instanceof MapStartError ? error.cause : error
  if (!(cause instanceof Error)) return 'other'
  // MapLibre's own, when it can't get a WebGL2 context
  if (cause.name === 'GPUInitializationError' || /webgl/i.test(cause.message))
    return 'webgl'
  if (LOAD_FAILED.test(cause.message)) return 'load'
  // Whatever else stops the map before it starts is most likely its
  // script failing to load or run
  return error instanceof MapStartError ? 'load' : 'other'
}
