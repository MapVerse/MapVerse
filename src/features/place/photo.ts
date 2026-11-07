/** Where a place's photo can be found: a file on Commons, or its Wikidata item. */
export type PhotoSource = { file: string } | { wikidata: string }

/** A photo to show, sized for the panel, and whom to credit for it. */
export type Photo = {
  src: string
  width: number
  height: number
  /** The file's page on Commons, with its author and licence */
  page: string
  author?: string
  license?: string
}

/** How wide a photo is asked for, in px: the panel's width, twice over. */
export const PHOTO_WIDTH = 640

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

/** Hosts Commons serves its files and their thumbnails from. */
const IMAGE_HOSTS = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org'])

/** A file name as Commons titles it: no prefix, spaces for underscores. */
function fileName(raw: string): string | undefined {
  const name = raw
    .trim()
    .replace(/^(File|Image|Dosya):/i, '')
    .replace(/_/g, ' ')
    .trim()
  // A file has an extension; "Category:…" and the like are not files
  if (!name || /^[a-z]+:/i.test(name) || !/\.[a-z0-9]{3,4}$/i.test(name)) {
    return undefined
  }
  return name
}

const decode = (text: string) => {
  try {
    return decodeURIComponent(text)
  } catch {
    return undefined
  }
}

/**
 * The Commons file an `image` link points to, if it is one: its page on
 * commons.wikimedia.org, or the file itself (or a thumbnail of it) on
 * upload.wikimedia.org. Only https links there are taken; an image from
 * anywhere else is left out.
 */
export function commonsFile(link: string): string | undefined {
  const value = link.trim()
  if (/^(File|Image):/i.test(value)) return fileName(value)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:') return undefined
  const path = url.pathname
  if (url.hostname === 'commons.wikimedia.org') {
    const page = /^\/wiki\/(?:File:|Special:FilePath\/)(.+)$/.exec(path)
    const name = page && decode(page[1])
    return name ? fileName(name) : undefined
  }
  if (IMAGE_HOSTS.has(url.hostname)) {
    // /wikipedia/commons/a/ab/Name.jpg, or …/thumb/a/ab/Name.jpg/640px-Name.jpg
    const file =
      /^\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(
        path,
      )
    const name = file && decode(file[1])
    return name ? fileName(name) : undefined
  }
  return undefined
}

const first = (value: string | undefined) => value?.split(';')[0].trim()

/**
 * Where to find a photo of a place from its tags: a Commons file it names
 * (`wikimedia_commons`, or an `image` on Commons), or else its Wikidata
 * item, whose image (P18) is on Commons.
 */
export function photoSource(
  tags: Record<string, string>,
): PhotoSource | undefined {
  const commons = first(tags.wikimedia_commons)
  const named = commons && fileName(commons)
  if (named) return { file: named }
  const image = first(tags.image)
  const linked = image && commonsFile(image)
  if (linked) return { file: linked }
  const item = first(tags.wikidata)
  if (item && /^Q\d{1,12}$/.test(item)) return { wikidata: item }
  return undefined
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** Text from the bit of HTML Commons gives for an author or a licence. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === '#') {
        const n =
          code[1] === 'x' || code[1] === 'X'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10)
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
      }
      return ENTITIES[code.toLowerCase()] ?? entity
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const isHttps = (value: unknown, hosts?: Set<string>): value is string => {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (!hosts || hosts.has(url.hostname))
  } catch {
    return false
  }
}

type ImageInfo = {
  thumburl?: unknown
  thumbwidth?: unknown
  thumbheight?: unknown
  descriptionurl?: unknown
  extmetadata?: Record<string, { value?: unknown } | undefined>
}

/** The photo in Commons' answer about a file, if it gave one fit to show. */
export function photoFromImageInfo(answer: unknown): Photo | undefined {
  const pages = (answer as { query?: { pages?: unknown } } | null)?.query?.pages
  const page = Array.isArray(pages) ? pages[0] : undefined
  const info = (page as { imageinfo?: ImageInfo[] } | undefined)?.imageinfo?.[0]
  if (!info) return undefined
  const { thumburl, thumbwidth, thumbheight, descriptionurl } = info
  if (!isHttps(thumburl, IMAGE_HOSTS)) return undefined
  if (!isHttps(descriptionurl, new Set(['commons.wikimedia.org']))) return
  const meta = info.extmetadata ?? {}
  const field = (name: string) => {
    const value = meta[name]?.value
    const text = typeof value === 'string' ? plainText(value) : ''
    return text ? text.slice(0, 120) : undefined
  }
  return {
    src: thumburl,
    width: typeof thumbwidth === 'number' ? thumbwidth : PHOTO_WIDTH,
    height: typeof thumbheight === 'number' ? thumbheight : 0,
    page: descriptionurl,
    author: field('Artist') ?? field('Credit'),
    license: field('LicenseShortName'),
  }
}

/** The Commons file a Wikidata item's image (P18) is, from its claims. */
export function fileFromClaims(answer: unknown): string | undefined {
  const claims = (answer as { claims?: { P18?: unknown } } | null)?.claims?.P18
  if (!Array.isArray(claims)) return undefined
  // A preferred image before a normal one, never a deprecated one
  const ranked = claims
    .filter((c: { rank?: string }) => c?.rank !== 'deprecated')
    .sort(
      (a: { rank?: string }, b: { rank?: string }) =>
        Number(b.rank === 'preferred') - Number(a.rank === 'preferred'),
    )
  const value = (
    ranked[0] as { mainsnak?: { datavalue?: { value?: unknown } } } | undefined
  )?.mainsnak?.datavalue?.value
  return typeof value === 'string' ? fileName(value) : undefined
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

async function commonsPhoto(file: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'Artist|Credit|LicenseShortName',
    iiurlwidth: String(PHOTO_WIDTH),
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  return photoFromImageInfo(await getJson(`${COMMONS_API}?${params}`, signal))
}

async function wikidataFile(item: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    action: 'wbgetclaims',
    entity: item,
    property: 'P18',
    format: 'json',
    origin: '*',
  })
  return fileFromClaims(await getJson(`${WIKIDATA_API}?${params}`, signal))
}

const cache = new Map<string, Promise<Photo | null>>()
// The answers already in, to show at once when a place opens again
const settled = new Map<string, Photo | null>()

const sourceKey = (source: PhotoSource) =>
  'file' in source ? `file:${source.file}` : `item:${source.wikidata}`

/** A photo already found for a source: undefined if not asked yet. */
export const knownPhoto = (source: PhotoSource) =>
  settled.get(sourceKey(source))

/**
 * A place's photo from Commons, found through its tags: null if it has
 * none. Asked once a source; a failure is tried again the next time.
 */
export function fetchPhoto(source: PhotoSource): Promise<Photo | null> {
  const key = sourceKey(source)
  const known = cache.get(key)
  if (known) return known
  const found = (async () => {
    const file =
      'file' in source ? source.file : await wikidataFile(source.wikidata)
    return (file && (await commonsPhoto(file))) || null
  })()
  cache.set(key, found)
  found.then((photo) => settled.set(key, photo)).catch(() => {})
  found.catch(() => cache.delete(key))
  return found
}
