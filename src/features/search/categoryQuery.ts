import { QUICK_CATEGORIES, type QuickCategory } from './overpass.ts'

/**
 * What each quick category is called when typed: its name and the other
 * words people use for it, and how a suggestion to search for it reads.
 */
const WORDS: Record<string, { terms: string[]; nearby: string }> = {
  restaurant: {
    terms: ['restoran', 'restorant', 'restaurant', 'lokanta', 'yemek yeri'],
    nearby: 'Yakındaki restoranlar',
  },
  cafe: {
    terms: ['kafe', 'cafe', 'kafeterya', 'kahve', 'kahveci', 'kahvehane'],
    nearby: 'Yakındaki kafeler',
  },
  supermarket: {
    terms: ['market', 'süpermarket', 'supermarket', 'bakkal', 'grocery'],
    nearby: 'Yakındaki marketler',
  },
  pharmacy: {
    terms: ['eczane', 'eczahane', 'pharmacy', 'nöbetçi eczane'],
    nearby: 'Yakındaki eczaneler',
  },
  fuel: {
    terms: [
      'akaryakıt',
      'akaryakıt istasyonu',
      'benzin',
      'benzinci',
      'benzinlik',
      'benzin istasyonu',
      'yakıt',
      'petrol',
      'motorin',
      'mazot',
      'gas station',
    ],
    nearby: 'Yakındaki akaryakıt istasyonları',
  },
  atm: {
    terms: ['atm', 'bankamatik', 'para çekme'],
    nearby: "Yakındaki ATM'ler",
  },
  hotel: {
    terms: ['otel', 'hotel', 'hostel', 'pansiyon', 'motel', 'konaklama'],
    nearby: 'Yakındaki oteller',
  },
  hospital: {
    terms: ['hastane', 'hospital', 'acil', 'acil servis', 'devlet hastanesi'],
    nearby: 'Yakındaki hastaneler',
  },
  park: { terms: ['park'], nearby: 'Yakındaki parklar' },
  museum: { terms: ['müze', 'museum'], nearby: 'Yakındaki müzeler' },
  parking: {
    terms: ['otopark', 'park yeri', 'parking', 'araba parkı'],
    nearby: 'Yakındaki otoparklar',
  },
  mosque: {
    terms: ['cami', 'camii', 'mescit', 'mescid', 'mosque'],
    nearby: 'Yakındaki camiler',
  },
}

/** Words around a category that ask for it nearby, and say nothing more. */
const FILLER = new Set(
  [
    'en',
    'yakın',
    'yakındaki',
    'yakınımdaki',
    'yakınımda',
    'yakınlarda',
    'yakınlardaki',
    'civardaki',
    'çevredeki',
    'buradaki',
    'nerede',
    'near',
    'me',
    'nearby',
  ].map(fold),
)

/**
 * Text as it is compared: lowered the Turkish way (İ to i, I to ı), then
 * without its accents, so "Eczane", "ECZANE" and "akaryakit" all match.
 */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** A typed word, without a suffix after an apostrophe or a plural one. */
function stems(word: string): string[] {
  const bare = word.split("'")[0]
  const forms = [bare]
  // Eczaneler, oteller, parklar, ATM'ler; and benzinciler, otoparklar
  const plural = /^(.{2,}?)(ler|lar)$/.exec(bare)
  if (plural) forms.push(plural[1])
  return forms
}

/** The folded terms of each category, longest first. */
const TERMS = QUICK_CATEGORIES.flatMap((category) =>
  (WORDS[category.key]?.terms ?? [category.label]).map((term) => ({
    category,
    term: fold(term),
  })),
).sort((a, b) => b.term.length - a.term.length)

/** How much of a term must be typed before it is guessed at. */
const PREFIX_MIN = 4

/**
 * The quick category a search names, if it names one: "eczane",
 * "Eczaneler", "en yakın benzinci", "atm'ler"… Only the category itself,
 * with at most words that ask for it nearby, so "Eczane Sokak" or a
 * place's name is left to the place search. A term half typed (four
 * letters and up) is guessed at as well.
 */
export function matchCategory(query: string): QuickCategory | undefined {
  const words = fold(query)
    .split(' ')
    .filter((word) => word && !FILLER.has(word))
  if (words.length === 0 || words.length > 3) return undefined
  const last = words.length - 1
  const typed = words.join(' ')
  // Plurals and suffixes are only looked for at the end
  const forms = stems(words[last]).map((stem) =>
    [...words.slice(0, last), stem].join(' '),
  )
  const exact = TERMS.find(({ term }) => forms.includes(term))
  if (exact) return exact.category
  if (typed.length < PREFIX_MIN) return undefined
  return TERMS.find(({ term }) => term.startsWith(typed))?.category
}

/** How a suggestion to search a category nearby reads. */
export const nearbyLabel = (category: QuickCategory) =>
  WORDS[category.key]?.nearby ?? `Yakındaki: ${category.label}`
