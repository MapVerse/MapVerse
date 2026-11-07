import type { GlyphName } from '../../icons/glyphs.ts'
import { currentLocale } from '../../i18n/index.ts'
import type { Theme } from '../../theme/theme.ts'

type Group =
  | 'food'
  | 'shop'
  | 'health'
  | 'money'
  | 'transit'
  | 'car'
  | 'lodging'
  | 'culture'
  | 'nature'
  | 'education'
  | 'worship'
  | 'service'
  | 'place'

/** Badge colour per category group; labels on the map use a darker shade. */
const GROUP_COLORS: Record<Group, string> = {
  food: '#f97316',
  shop: '#3b82f6',
  health: '#ef4444',
  money: '#14b8a6',
  transit: '#6366f1',
  car: '#64748b',
  lodging: '#ec4899',
  culture: '#0891b2',
  nature: '#22c55e',
  education: '#a855f7',
  worship: '#78716c',
  service: '#64748b',
  place: '#64748b',
}

/** A kind of place: its name in Turkish and in English, glyph and group. */
type Category = { label: string; en: string; glyph: GlyphName; group: Group }

const place = (label: string, en: string): Category => ({
  label,
  en,
  glyph: 'pin',
  group: 'place',
})

const CATEGORIES: Record<string, Category> = {
  // Result types and OSM place=* values
  country: place('Ülke', 'Country'),
  state: place('İl', 'Province'),
  county: place('İlçe', 'District'),
  city: place('Şehir', 'City'),
  town: place('Kasaba', 'Town'),
  village: place('Köy', 'Village'),
  district: place('Semt', 'Neighbourhood'),
  suburb: place('Semt', 'Neighbourhood'),
  neighbourhood: place('Mahalle', 'Quarter'),
  locality: place('Mevki', 'Locality'),
  street: place('Yol', 'Street'),
  house: place('Adres', 'Address'),
  // Points of interest (OSM and OpenMapTiles classes)
  restaurant: {
    label: 'Restoran',
    en: 'Restaurant',
    glyph: 'restaurant',
    group: 'food',
  },
  food_court: {
    label: 'Yemek alanı',
    en: 'Food court',
    glyph: 'restaurant',
    group: 'food',
  },
  cafe: { label: 'Kafe', en: 'Café', glyph: 'cafe', group: 'food' },
  fast_food: {
    label: 'Fast food',
    en: 'Fast food',
    glyph: 'burger',
    group: 'food',
  },
  bar: { label: 'Bar', en: 'Bar', glyph: 'glass', group: 'food' },
  pub: { label: 'Pub', en: 'Pub', glyph: 'glass', group: 'food' },
  beer: { label: 'Birahane', en: 'Beer hall', glyph: 'glass', group: 'food' },
  ice_cream: {
    label: 'Dondurmacı',
    en: 'Ice cream shop',
    glyph: 'icecream',
    group: 'food',
  },
  bakery: { label: 'Fırın', en: 'Bakery', glyph: 'bread', group: 'food' },
  pastry: { label: 'Pastane', en: 'Patisserie', glyph: 'bread', group: 'food' },
  confectionery: {
    label: 'Şekerci',
    en: 'Sweet shop',
    glyph: 'bread',
    group: 'food',
  },
  nightclub: {
    label: 'Gece kulübü',
    en: 'Nightclub',
    glyph: 'glass',
    group: 'food',
  },
  biergarten: {
    label: 'Bira bahçesi',
    en: 'Beer garden',
    glyph: 'glass',
    group: 'food',
  },
  supermarket: {
    label: 'Süpermarket',
    en: 'Supermarket',
    glyph: 'cart',
    group: 'shop',
  },
  grocery: { label: 'Market', en: 'Grocery', glyph: 'cart', group: 'shop' },
  convenience: {
    label: 'Bakkal',
    en: 'Convenience store',
    glyph: 'cart',
    group: 'shop',
  },
  marketplace: {
    label: 'Pazar yeri',
    en: 'Marketplace',
    glyph: 'cart',
    group: 'shop',
  },
  shop: { label: 'Mağaza', en: 'Shop', glyph: 'bag', group: 'shop' },
  clothes: {
    label: 'Giyim mağazası',
    en: 'Clothes shop',
    glyph: 'bag',
    group: 'shop',
  },
  clothing_store: {
    label: 'Giyim mağazası',
    en: 'Clothes shop',
    glyph: 'bag',
    group: 'shop',
  },
  mall: {
    label: 'Alışveriş merkezi',
    en: 'Shopping mall',
    glyph: 'bag',
    group: 'shop',
  },
  department_store: {
    label: 'Mağaza',
    en: 'Department store',
    glyph: 'bag',
    group: 'shop',
  },
  greengrocer: {
    label: 'Manav',
    en: 'Greengrocer',
    glyph: 'cart',
    group: 'shop',
  },
  butcher: { label: 'Kasap', en: 'Butcher', glyph: 'cart', group: 'shop' },
  deli: { label: 'Şarküteri', en: 'Deli', glyph: 'cart', group: 'shop' },
  kiosk: { label: 'Büfe', en: 'Kiosk', glyph: 'cart', group: 'shop' },
  alcohol: {
    label: 'Tekel bayi',
    en: 'Liquor store',
    glyph: 'glass',
    group: 'shop',
  },
  alcohol_shop: {
    label: 'Tekel bayi',
    en: 'Liquor store',
    glyph: 'glass',
    group: 'shop',
  },
  beverages: {
    label: 'İçecek',
    en: 'Drinks shop',
    glyph: 'glass',
    group: 'shop',
  },
  wine: { label: 'Şarap', en: 'Wine shop', glyph: 'glass', group: 'shop' },
  tobacco: {
    label: 'Tekel bayi',
    en: 'Tobacconist',
    glyph: 'bag',
    group: 'shop',
  },
  hairdresser: {
    label: 'Kuaför',
    en: 'Hairdresser',
    glyph: 'bag',
    group: 'shop',
  },
  beauty: {
    label: 'Güzellik salonu',
    en: 'Beauty salon',
    glyph: 'bag',
    group: 'shop',
  },
  cosmetics: {
    label: 'Kozmetik',
    en: 'Cosmetics',
    glyph: 'bag',
    group: 'shop',
  },
  chemist: { label: 'Kozmetik', en: 'Chemist', glyph: 'bag', group: 'shop' },
  florist: { label: 'Çiçekçi', en: 'Florist', glyph: 'bag', group: 'shop' },
  books: { label: 'Kitapçı', en: 'Bookshop', glyph: 'book', group: 'shop' },
  stationery: {
    label: 'Kırtasiye',
    en: 'Stationery',
    glyph: 'book',
    group: 'shop',
  },
  jewelry: { label: 'Kuyumcu', en: 'Jeweller', glyph: 'bag', group: 'shop' },
  optician: { label: 'Gözlükçü', en: 'Optician', glyph: 'bag', group: 'shop' },
  shoes: { label: 'Ayakkabıcı', en: 'Shoe shop', glyph: 'bag', group: 'shop' },
  bag: { label: 'Çantacı', en: 'Bag shop', glyph: 'bag', group: 'shop' },
  mobile_phone: {
    label: 'Telefoncu',
    en: 'Phone shop',
    glyph: 'bag',
    group: 'shop',
  },
  electronics: {
    label: 'Elektronik',
    en: 'Electronics',
    glyph: 'bag',
    group: 'shop',
  },
  computer: {
    label: 'Bilgisayar',
    en: 'Computers',
    glyph: 'bag',
    group: 'shop',
  },
  furniture: { label: 'Mobilya', en: 'Furniture', glyph: 'bag', group: 'shop' },
  hardware: {
    label: 'Hırdavat',
    en: 'Hardware store',
    glyph: 'bag',
    group: 'shop',
  },
  doityourself: {
    label: 'Yapı market',
    en: 'DIY store',
    glyph: 'bag',
    group: 'shop',
  },
  gift: {
    label: 'Hediyelik eşya',
    en: 'Gift shop',
    glyph: 'bag',
    group: 'shop',
  },
  toys: { label: 'Oyuncakçı', en: 'Toy shop', glyph: 'bag', group: 'shop' },
  sports: {
    label: 'Spor mağazası',
    en: 'Sports shop',
    glyph: 'bag',
    group: 'shop',
  },
  pet: { label: 'Pet shop', en: 'Pet shop', glyph: 'paw', group: 'shop' },
  music: {
    label: 'Müzik mağazası',
    en: 'Music shop',
    glyph: 'bag',
    group: 'shop',
  },
  laundry: {
    label: 'Çamaşırhane',
    en: 'Laundry',
    glyph: 'bag',
    group: 'service',
  },
  dry_cleaning: {
    label: 'Kuru temizleme',
    en: 'Dry cleaner',
    glyph: 'bag',
    group: 'service',
  },
  travel_agency: {
    label: 'Seyahat acentesi',
    en: 'Travel agency',
    glyph: 'bag',
    group: 'service',
  },
  pharmacy: { label: 'Eczane', en: 'Pharmacy', glyph: 'pill', group: 'health' },
  hospital: {
    label: 'Hastane',
    en: 'Hospital',
    glyph: 'cross',
    group: 'health',
  },
  clinic: { label: 'Klinik', en: 'Clinic', glyph: 'cross', group: 'health' },
  doctors: { label: 'Doktor', en: 'Doctor', glyph: 'cross', group: 'health' },
  dentist: {
    label: 'Diş hekimi',
    en: 'Dentist',
    glyph: 'cross',
    group: 'health',
  },
  veterinary: { label: 'Veteriner', en: 'Vet', glyph: 'paw', group: 'health' },
  nursing_home: {
    label: 'Huzurevi',
    en: 'Nursing home',
    glyph: 'cross',
    group: 'health',
  },
  bank: { label: 'Banka', en: 'Bank', glyph: 'money', group: 'money' },
  atm: { label: 'ATM', en: 'ATM', glyph: 'money', group: 'money' },
  bureau_de_change: {
    label: 'Döviz bürosu',
    en: 'Currency exchange',
    glyph: 'money',
    group: 'money',
  },
  fuel: {
    label: 'Akaryakıt istasyonu',
    en: 'Gas station',
    glyph: 'fuel',
    group: 'car',
  },
  parking: { label: 'Otopark', en: 'Parking', glyph: 'parking', group: 'car' },
  charging_station: {
    label: 'Şarj istasyonu',
    en: 'Charging station',
    glyph: 'fuel',
    group: 'car',
  },
  car: { label: 'Oto galeri', en: 'Car dealer', glyph: 'pin', group: 'car' },
  car_repair: {
    label: 'Oto servis',
    en: 'Car repair',
    glyph: 'pin',
    group: 'car',
  },
  car_parts: {
    label: 'Oto yedek parça',
    en: 'Car parts',
    glyph: 'pin',
    group: 'car',
  },
  taxi: { label: 'Taksi durağı', en: 'Taxi stand', glyph: 'pin', group: 'car' },
  bus: {
    label: 'Otobüs durağı',
    en: 'Bus stop',
    glyph: 'bus',
    group: 'transit',
  },
  bus_stop: {
    label: 'Otobüs durağı',
    en: 'Bus stop',
    glyph: 'bus',
    group: 'transit',
  },
  bus_station: {
    label: 'Otogar',
    en: 'Bus station',
    glyph: 'bus',
    group: 'transit',
  },
  railway: {
    label: 'İstasyon',
    en: 'Station',
    glyph: 'train',
    group: 'transit',
  },
  station: {
    label: 'İstasyon',
    en: 'Station',
    glyph: 'train',
    group: 'transit',
  },
  ferry_terminal: {
    label: 'İskele',
    en: 'Ferry terminal',
    glyph: 'ship',
    group: 'transit',
  },
  halt: { label: 'İstasyon', en: 'Station', glyph: 'train', group: 'transit' },
  tram_stop: {
    label: 'Tramvay durağı',
    en: 'Tram stop',
    glyph: 'train',
    group: 'transit',
  },
  aerialway: {
    label: 'Teleferik',
    en: 'Cable car',
    glyph: 'train',
    group: 'transit',
  },
  bicycle_rental: {
    label: 'Bisiklet kiralama',
    en: 'Bike rental',
    glyph: 'pin',
    group: 'transit',
  },
  marina: { label: 'Marina', en: 'Marina', glyph: 'ship', group: 'transit' },
  dock: { label: 'Rıhtım', en: 'Dock', glyph: 'ship', group: 'transit' },
  harbor: { label: 'Liman', en: 'Harbour', glyph: 'ship', group: 'transit' },
  lodging: {
    label: 'Konaklama',
    en: 'Lodging',
    glyph: 'bed',
    group: 'lodging',
  },
  hotel: { label: 'Otel', en: 'Hotel', glyph: 'bed', group: 'lodging' },
  hostel: { label: 'Hostel', en: 'Hostel', glyph: 'bed', group: 'lodging' },
  guest_house: {
    label: 'Pansiyon',
    en: 'Guest house',
    glyph: 'bed',
    group: 'lodging',
  },
  bed_and_breakfast: {
    label: 'Pansiyon',
    en: 'Bed and breakfast',
    glyph: 'bed',
    group: 'lodging',
  },
  motel: { label: 'Motel', en: 'Motel', glyph: 'bed', group: 'lodging' },
  chalet: { label: 'Dağ evi', en: 'Chalet', glyph: 'bed', group: 'lodging' },
  campsite: {
    label: 'Kamp alanı',
    en: 'Campsite',
    glyph: 'tree',
    group: 'nature',
  },
  camp_site: {
    label: 'Kamp alanı',
    en: 'Campsite',
    glyph: 'tree',
    group: 'nature',
  },
  museum: { label: 'Müze', en: 'Museum', glyph: 'museum', group: 'culture' },
  art_gallery: {
    label: 'Sanat galerisi',
    en: 'Art gallery',
    glyph: 'frame',
    group: 'culture',
  },
  gallery: {
    label: 'Sanat galerisi',
    en: 'Art gallery',
    glyph: 'frame',
    group: 'culture',
  },
  arts_centre: {
    label: 'Sanat merkezi',
    en: 'Arts centre',
    glyph: 'frame',
    group: 'culture',
  },
  artwork: {
    label: 'Sanat eseri',
    en: 'Artwork',
    glyph: 'frame',
    group: 'culture',
  },
  community_centre: {
    label: 'Kültür merkezi',
    en: 'Community centre',
    glyph: 'ticket',
    group: 'culture',
  },
  attraction: {
    label: 'Turistik yer',
    en: 'Attraction',
    glyph: 'star',
    group: 'culture',
  },
  viewpoint: {
    label: 'Seyir noktası',
    en: 'Viewpoint',
    glyph: 'camera',
    group: 'culture',
  },
  castle: { label: 'Kale', en: 'Castle', glyph: 'castle', group: 'culture' },
  ruins: {
    label: 'Tarihi kalıntı',
    en: 'Ruins',
    glyph: 'castle',
    group: 'culture',
  },
  theme_park: {
    label: 'Eğlence parkı',
    en: 'Theme park',
    glyph: 'star',
    group: 'culture',
  },
  monument: {
    label: 'Anıt',
    en: 'Monument',
    glyph: 'monument',
    group: 'culture',
  },
  memorial: {
    label: 'Anıt',
    en: 'Memorial',
    glyph: 'monument',
    group: 'culture',
  },
  cinema: { label: 'Sinema', en: 'Cinema', glyph: 'film', group: 'culture' },
  theatre: {
    label: 'Tiyatro',
    en: 'Theatre',
    glyph: 'ticket',
    group: 'culture',
  },
  place_of_worship: {
    label: 'İbadethane',
    en: 'Place of worship',
    glyph: 'mosque',
    group: 'worship',
  },
  mosque: { label: 'Cami', en: 'Mosque', glyph: 'mosque', group: 'worship' },
  park: { label: 'Park', en: 'Park', glyph: 'tree', group: 'nature' },
  garden: { label: 'Bahçe', en: 'Garden', glyph: 'tree', group: 'nature' },
  playground: {
    label: 'Oyun parkı',
    en: 'Playground',
    glyph: 'tree',
    group: 'nature',
  },
  zoo: { label: 'Hayvanat bahçesi', en: 'Zoo', glyph: 'paw', group: 'nature' },
  aquarium: {
    label: 'Akvaryum',
    en: 'Aquarium',
    glyph: 'paw',
    group: 'nature',
  },
  picnic_site: {
    label: 'Piknik alanı',
    en: 'Picnic site',
    glyph: 'tree',
    group: 'nature',
  },
  dog_park: {
    label: 'Köpek parkı',
    en: 'Dog park',
    glyph: 'paw',
    group: 'nature',
  },
  stadium: { label: 'Stadyum', en: 'Stadium', glyph: 'ball', group: 'nature' },
  sports_centre: {
    label: 'Spor merkezi',
    en: 'Sports centre',
    glyph: 'ball',
    group: 'nature',
  },
  pitch: {
    label: 'Spor sahası',
    en: 'Sports pitch',
    glyph: 'ball',
    group: 'nature',
  },
  golf: {
    label: 'Golf sahası',
    en: 'Golf course',
    glyph: 'ball',
    group: 'nature',
  },
  golf_course: {
    label: 'Golf sahası',
    en: 'Golf course',
    glyph: 'ball',
    group: 'nature',
  },
  ice_rink: {
    label: 'Buz pisti',
    en: 'Ice rink',
    glyph: 'ball',
    group: 'nature',
  },
  swimming: {
    label: 'Yüzme alanı',
    en: 'Swimming area',
    glyph: 'ball',
    group: 'nature',
  },
  swimming_area: {
    label: 'Yüzme alanı',
    en: 'Swimming area',
    glyph: 'ball',
    group: 'nature',
  },
  swimming_pool: {
    label: 'Yüzme havuzu',
    en: 'Swimming pool',
    glyph: 'ball',
    group: 'nature',
  },
  water_park: {
    label: 'Su parkı',
    en: 'Water park',
    glyph: 'ball',
    group: 'nature',
  },
  school: { label: 'Okul', en: 'School', glyph: 'cap', group: 'education' },
  kindergarten: {
    label: 'Anaokulu',
    en: 'Kindergarten',
    glyph: 'cap',
    group: 'education',
  },
  college: {
    label: 'Yüksekokul',
    en: 'College',
    glyph: 'cap',
    group: 'education',
  },
  university: {
    label: 'Üniversite',
    en: 'University',
    glyph: 'cap',
    group: 'education',
  },
  library: {
    label: 'Kütüphane',
    en: 'Library',
    glyph: 'book',
    group: 'education',
  },
  post: {
    label: 'Postane',
    en: 'Post office',
    glyph: 'envelope',
    group: 'service',
  },
  post_office: {
    label: 'Postane',
    en: 'Post office',
    glyph: 'envelope',
    group: 'service',
  },
  police: { label: 'Karakol', en: 'Police', glyph: 'shield', group: 'service' },
  town_hall: {
    label: 'Belediye',
    en: 'Town hall',
    glyph: 'museum',
    group: 'service',
  },
  townhall: {
    label: 'Belediye',
    en: 'Town hall',
    glyph: 'museum',
    group: 'service',
  },
  courthouse: {
    label: 'Adliye',
    en: 'Courthouse',
    glyph: 'museum',
    group: 'service',
  },
  public_building: {
    label: 'Kamu binası',
    en: 'Public building',
    glyph: 'museum',
    group: 'service',
  },
  fire_station: {
    label: 'İtfaiye',
    en: 'Fire station',
    glyph: 'shield',
    group: 'service',
  },
  prison: { label: 'Cezaevi', en: 'Prison', glyph: 'shield', group: 'service' },
  office: { label: 'Ofis', en: 'Office', glyph: 'pin', group: 'service' },
  cemetery: {
    label: 'Mezarlık',
    en: 'Cemetery',
    glyph: 'pin',
    group: 'worship',
  },
  grave_yard: {
    label: 'Mezarlık',
    en: 'Graveyard',
    glyph: 'pin',
    group: 'worship',
  },
}

/** A category, its `label` in the language in use. */
export type CategoryInfo = Omit<Category, 'en'> & { key: string; color: string }

/** Every category key, for building map style expressions. */
export const CATEGORY_KEYS = Object.keys(CATEGORIES)

const FALLBACK: Category = {
  label: 'Yer',
  en: 'Place',
  glyph: 'pin',
  group: 'place',
}

const infoOf = (key: string, { en, ...category }: Category): CategoryInfo => ({
  ...category,
  ...(currentLocale() === 'en' && { label: en }),
  key,
  color: GROUP_COLORS[category.group],
})

/** Any place, of a kind not known; its label in the language in use. */
export const fallbackCategory = (): CategoryInfo => infoOf('place', FALLBACK)

/** The fallback's key, glyph and colour, which no language changes. */
export const FALLBACK_CATEGORY = {
  key: 'place',
  glyph: FALLBACK.glyph,
  color: GROUP_COLORS.place,
} as const

/**
 * The first key we know among `keys`, with its label (in the language in
 * use), glyph and colour.
 */
export function categoryInfo(
  ...keys: (string | undefined)[]
): CategoryInfo | undefined {
  const key = keys.find((k) => k && Object.hasOwn(CATEGORIES, k))
  if (!key) return undefined
  return infoOf(key, CATEGORIES[key])
}

/**
 * The label, in the language in use, for the first key we know, else a
 * readable form of the first key.
 */
export function categoryLabel(
  ...keys: (string | undefined)[]
): string | undefined {
  const info = categoryInfo(...keys)
  if (info) return info.label
  const first = keys.find((key) => key && key !== 'yes')
  return first && humanize(first)
}

/**
 * A shade of a category colour that reads as text on the map: darker on the
 * light map, lighter on the dark one.
 */
export function labelColor(color: string, theme: Theme = 'light'): string {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  const shade =
    theme === 'light'
      ? (c: number) => c * 0.72
      : (c: number) => c + (255 - c) * 0.3
  return `rgb(${channels.map((c) => Math.round(shade(c))).join(' ')})`
}

function humanize(key: string) {
  const text = key.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
