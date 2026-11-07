import { QUICK_CATEGORIES, type QuickCategory } from '../search/overpass.ts'
import { PLACE_PARAM, decodePlace, type SharedPlace } from './link.ts'

/**
 * What a link or a home screen shortcut asks the app to open as it
 * starts: a shared place (`?place=`), places of a category nearby
 * (`?category=pharmacy`) or the saved places (`?saved=1`).
 */
export type Launch = {
  place?: SharedPlace
  category?: QuickCategory
  saved?: boolean
  /** The link set the view (`#zoom/lat/lng`), so there is no need to move */
  hasView: boolean
}

/** The parameters read here, taken out of the address once read. */
const PARAMS = [PLACE_PARAM, 'category', 'saved']

export function parseLaunch(search: string, hash = ''): Launch {
  const params = new URLSearchParams(search)
  const category = QUICK_CATEGORIES.find(
    (c) => c.key === params.get('category'),
  )
  const place = decodePlace(params.get(PLACE_PARAM))
  return {
    ...(place && { place }),
    ...(category && { category }),
    ...(params.has('saved') && params.get('saved') !== '0' && { saved: true }),
    hasView: /^#\d/.test(hash),
  }
}

/** The address without the parameters read here; any others stay. */
export function withoutLaunch(href: string): string {
  const url = new URL(href)
  if (!PARAMS.some((param) => url.searchParams.has(param))) return href
  for (const param of PARAMS) url.searchParams.delete(param)
  return url.href
}

let launch: Launch | undefined

/**
 * What the app was opened with, read once: the first call takes it out
 * of the address (keeping the map's `#zoom/lat/lng` and anything else),
 * so a reload or a copied address doesn't open it again.
 */
export function takeLaunch(): Launch {
  if (launch) return launch
  launch = parseLaunch(location.search, location.hash)
  const clean = withoutLaunch(location.href)
  if (clean !== location.href) {
    try {
      history.replaceState(history.state, '', clean)
    } catch {
      // Some embedded browsers refuse; the address then stays as it was
    }
  }
  return launch
}
