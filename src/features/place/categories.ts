import type { GlyphName } from '../../icons/glyphs.ts'
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

type Category = { label: string; glyph: GlyphName; group: Group }

const place = (label: string): Category => ({
  label,
  glyph: 'pin',
  group: 'place',
})

const CATEGORIES: Record<string, Category> = {
  // Result types and OSM place=* values
  country: place('Ülke'),
  state: place('İl'),
  county: place('İlçe'),
  city: place('Şehir'),
  town: place('Kasaba'),
  village: place('Köy'),
  district: place('Semt'),
  suburb: place('Semt'),
  neighbourhood: place('Mahalle'),
  locality: place('Mevki'),
  street: place('Yol'),
  house: place('Adres'),
  // Points of interest (OSM and OpenMapTiles classes)
  restaurant: { label: 'Restoran', glyph: 'restaurant', group: 'food' },
  food_court: { label: 'Yemek alanı', glyph: 'restaurant', group: 'food' },
  cafe: { label: 'Kafe', glyph: 'cafe', group: 'food' },
  fast_food: { label: 'Fast food', glyph: 'burger', group: 'food' },
  bar: { label: 'Bar', glyph: 'glass', group: 'food' },
  pub: { label: 'Pub', glyph: 'glass', group: 'food' },
  beer: { label: 'Birahane', glyph: 'glass', group: 'food' },
  ice_cream: { label: 'Dondurmacı', glyph: 'icecream', group: 'food' },
  bakery: { label: 'Fırın', glyph: 'bread', group: 'food' },
  pastry: { label: 'Pastane', glyph: 'bread', group: 'food' },
  confectionery: { label: 'Şekerci', glyph: 'bread', group: 'food' },
  nightclub: { label: 'Gece kulübü', glyph: 'glass', group: 'food' },
  biergarten: { label: 'Bira bahçesi', glyph: 'glass', group: 'food' },
  supermarket: { label: 'Süpermarket', glyph: 'cart', group: 'shop' },
  grocery: { label: 'Market', glyph: 'cart', group: 'shop' },
  convenience: { label: 'Bakkal', glyph: 'cart', group: 'shop' },
  marketplace: { label: 'Pazar yeri', glyph: 'cart', group: 'shop' },
  shop: { label: 'Mağaza', glyph: 'bag', group: 'shop' },
  clothes: { label: 'Giyim mağazası', glyph: 'bag', group: 'shop' },
  clothing_store: { label: 'Giyim mağazası', glyph: 'bag', group: 'shop' },
  mall: { label: 'Alışveriş merkezi', glyph: 'bag', group: 'shop' },
  department_store: { label: 'Mağaza', glyph: 'bag', group: 'shop' },
  greengrocer: { label: 'Manav', glyph: 'cart', group: 'shop' },
  butcher: { label: 'Kasap', glyph: 'cart', group: 'shop' },
  deli: { label: 'Şarküteri', glyph: 'cart', group: 'shop' },
  kiosk: { label: 'Büfe', glyph: 'cart', group: 'shop' },
  alcohol: { label: 'Tekel bayi', glyph: 'glass', group: 'shop' },
  alcohol_shop: { label: 'Tekel bayi', glyph: 'glass', group: 'shop' },
  beverages: { label: 'İçecek', glyph: 'glass', group: 'shop' },
  wine: { label: 'Şarap', glyph: 'glass', group: 'shop' },
  tobacco: { label: 'Tekel bayi', glyph: 'bag', group: 'shop' },
  hairdresser: { label: 'Kuaför', glyph: 'bag', group: 'shop' },
  beauty: { label: 'Güzellik salonu', glyph: 'bag', group: 'shop' },
  cosmetics: { label: 'Kozmetik', glyph: 'bag', group: 'shop' },
  chemist: { label: 'Kozmetik', glyph: 'bag', group: 'shop' },
  florist: { label: 'Çiçekçi', glyph: 'bag', group: 'shop' },
  books: { label: 'Kitapçı', glyph: 'book', group: 'shop' },
  stationery: { label: 'Kırtasiye', glyph: 'book', group: 'shop' },
  jewelry: { label: 'Kuyumcu', glyph: 'bag', group: 'shop' },
  optician: { label: 'Gözlükçü', glyph: 'bag', group: 'shop' },
  shoes: { label: 'Ayakkabıcı', glyph: 'bag', group: 'shop' },
  bag: { label: 'Çantacı', glyph: 'bag', group: 'shop' },
  mobile_phone: { label: 'Telefoncu', glyph: 'bag', group: 'shop' },
  electronics: { label: 'Elektronik', glyph: 'bag', group: 'shop' },
  computer: { label: 'Bilgisayar', glyph: 'bag', group: 'shop' },
  furniture: { label: 'Mobilya', glyph: 'bag', group: 'shop' },
  hardware: { label: 'Hırdavat', glyph: 'bag', group: 'shop' },
  doityourself: { label: 'Yapı market', glyph: 'bag', group: 'shop' },
  gift: { label: 'Hediyelik eşya', glyph: 'bag', group: 'shop' },
  toys: { label: 'Oyuncakçı', glyph: 'bag', group: 'shop' },
  sports: { label: 'Spor mağazası', glyph: 'bag', group: 'shop' },
  pet: { label: 'Pet shop', glyph: 'paw', group: 'shop' },
  music: { label: 'Müzik mağazası', glyph: 'bag', group: 'shop' },
  laundry: { label: 'Çamaşırhane', glyph: 'bag', group: 'service' },
  dry_cleaning: { label: 'Kuru temizleme', glyph: 'bag', group: 'service' },
  travel_agency: { label: 'Seyahat acentesi', glyph: 'bag', group: 'service' },
  pharmacy: { label: 'Eczane', glyph: 'pill', group: 'health' },
  hospital: { label: 'Hastane', glyph: 'cross', group: 'health' },
  clinic: { label: 'Klinik', glyph: 'cross', group: 'health' },
  doctors: { label: 'Doktor', glyph: 'cross', group: 'health' },
  dentist: { label: 'Diş hekimi', glyph: 'cross', group: 'health' },
  veterinary: { label: 'Veteriner', glyph: 'paw', group: 'health' },
  nursing_home: { label: 'Huzurevi', glyph: 'cross', group: 'health' },
  bank: { label: 'Banka', glyph: 'money', group: 'money' },
  atm: { label: 'ATM', glyph: 'money', group: 'money' },
  bureau_de_change: { label: 'Döviz bürosu', glyph: 'money', group: 'money' },
  fuel: { label: 'Akaryakıt istasyonu', glyph: 'fuel', group: 'car' },
  parking: { label: 'Otopark', glyph: 'parking', group: 'car' },
  charging_station: { label: 'Şarj istasyonu', glyph: 'fuel', group: 'car' },
  car: { label: 'Oto galeri', glyph: 'pin', group: 'car' },
  car_repair: { label: 'Oto servis', glyph: 'pin', group: 'car' },
  car_parts: { label: 'Oto yedek parça', glyph: 'pin', group: 'car' },
  taxi: { label: 'Taksi durağı', glyph: 'pin', group: 'car' },
  bus: { label: 'Otobüs durağı', glyph: 'bus', group: 'transit' },
  bus_stop: { label: 'Otobüs durağı', glyph: 'bus', group: 'transit' },
  bus_station: { label: 'Otogar', glyph: 'bus', group: 'transit' },
  railway: { label: 'İstasyon', glyph: 'train', group: 'transit' },
  station: { label: 'İstasyon', glyph: 'train', group: 'transit' },
  ferry_terminal: { label: 'İskele', glyph: 'ship', group: 'transit' },
  halt: { label: 'İstasyon', glyph: 'train', group: 'transit' },
  tram_stop: { label: 'Tramvay durağı', glyph: 'train', group: 'transit' },
  aerialway: { label: 'Teleferik', glyph: 'train', group: 'transit' },
  bicycle_rental: {
    label: 'Bisiklet kiralama',
    glyph: 'pin',
    group: 'transit',
  },
  marina: { label: 'Marina', glyph: 'ship', group: 'transit' },
  dock: { label: 'Rıhtım', glyph: 'ship', group: 'transit' },
  harbor: { label: 'Liman', glyph: 'ship', group: 'transit' },
  lodging: { label: 'Konaklama', glyph: 'bed', group: 'lodging' },
  hotel: { label: 'Otel', glyph: 'bed', group: 'lodging' },
  hostel: { label: 'Hostel', glyph: 'bed', group: 'lodging' },
  guest_house: { label: 'Pansiyon', glyph: 'bed', group: 'lodging' },
  bed_and_breakfast: { label: 'Pansiyon', glyph: 'bed', group: 'lodging' },
  motel: { label: 'Motel', glyph: 'bed', group: 'lodging' },
  chalet: { label: 'Dağ evi', glyph: 'bed', group: 'lodging' },
  campsite: { label: 'Kamp alanı', glyph: 'tree', group: 'nature' },
  camp_site: { label: 'Kamp alanı', glyph: 'tree', group: 'nature' },
  museum: { label: 'Müze', glyph: 'museum', group: 'culture' },
  art_gallery: { label: 'Sanat galerisi', glyph: 'frame', group: 'culture' },
  gallery: { label: 'Sanat galerisi', glyph: 'frame', group: 'culture' },
  arts_centre: { label: 'Sanat merkezi', glyph: 'frame', group: 'culture' },
  artwork: { label: 'Sanat eseri', glyph: 'frame', group: 'culture' },
  community_centre: {
    label: 'Kültür merkezi',
    glyph: 'ticket',
    group: 'culture',
  },
  attraction: { label: 'Turistik yer', glyph: 'star', group: 'culture' },
  viewpoint: { label: 'Seyir noktası', glyph: 'camera', group: 'culture' },
  castle: { label: 'Kale', glyph: 'castle', group: 'culture' },
  ruins: { label: 'Tarihi kalıntı', glyph: 'castle', group: 'culture' },
  theme_park: { label: 'Eğlence parkı', glyph: 'star', group: 'culture' },
  monument: { label: 'Anıt', glyph: 'monument', group: 'culture' },
  memorial: { label: 'Anıt', glyph: 'monument', group: 'culture' },
  cinema: { label: 'Sinema', glyph: 'film', group: 'culture' },
  theatre: { label: 'Tiyatro', glyph: 'ticket', group: 'culture' },
  place_of_worship: { label: 'İbadethane', glyph: 'mosque', group: 'worship' },
  mosque: { label: 'Cami', glyph: 'mosque', group: 'worship' },
  park: { label: 'Park', glyph: 'tree', group: 'nature' },
  garden: { label: 'Bahçe', glyph: 'tree', group: 'nature' },
  playground: { label: 'Oyun parkı', glyph: 'tree', group: 'nature' },
  zoo: { label: 'Hayvanat bahçesi', glyph: 'paw', group: 'nature' },
  aquarium: { label: 'Akvaryum', glyph: 'paw', group: 'nature' },
  picnic_site: { label: 'Piknik alanı', glyph: 'tree', group: 'nature' },
  dog_park: { label: 'Köpek parkı', glyph: 'paw', group: 'nature' },
  stadium: { label: 'Stadyum', glyph: 'ball', group: 'nature' },
  sports_centre: { label: 'Spor merkezi', glyph: 'ball', group: 'nature' },
  pitch: { label: 'Spor sahası', glyph: 'ball', group: 'nature' },
  golf: { label: 'Golf sahası', glyph: 'ball', group: 'nature' },
  golf_course: { label: 'Golf sahası', glyph: 'ball', group: 'nature' },
  ice_rink: { label: 'Buz pisti', glyph: 'ball', group: 'nature' },
  swimming: { label: 'Yüzme alanı', glyph: 'ball', group: 'nature' },
  swimming_area: { label: 'Yüzme alanı', glyph: 'ball', group: 'nature' },
  swimming_pool: { label: 'Yüzme havuzu', glyph: 'ball', group: 'nature' },
  water_park: { label: 'Su parkı', glyph: 'ball', group: 'nature' },
  school: { label: 'Okul', glyph: 'cap', group: 'education' },
  kindergarten: { label: 'Anaokulu', glyph: 'cap', group: 'education' },
  college: { label: 'Yüksekokul', glyph: 'cap', group: 'education' },
  university: { label: 'Üniversite', glyph: 'cap', group: 'education' },
  library: { label: 'Kütüphane', glyph: 'book', group: 'education' },
  post: { label: 'Postane', glyph: 'envelope', group: 'service' },
  post_office: { label: 'Postane', glyph: 'envelope', group: 'service' },
  police: { label: 'Karakol', glyph: 'shield', group: 'service' },
  town_hall: { label: 'Belediye', glyph: 'museum', group: 'service' },
  townhall: { label: 'Belediye', glyph: 'museum', group: 'service' },
  courthouse: { label: 'Adliye', glyph: 'museum', group: 'service' },
  public_building: { label: 'Kamu binası', glyph: 'museum', group: 'service' },
  fire_station: { label: 'İtfaiye', glyph: 'shield', group: 'service' },
  prison: { label: 'Cezaevi', glyph: 'shield', group: 'service' },
  office: { label: 'Ofis', glyph: 'pin', group: 'service' },
  cemetery: { label: 'Mezarlık', glyph: 'pin', group: 'worship' },
  grave_yard: { label: 'Mezarlık', glyph: 'pin', group: 'worship' },
}

export type CategoryInfo = Category & { key: string; color: string }

/** Every category key, for building map style expressions. */
export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export const FALLBACK_CATEGORY: CategoryInfo = {
  key: 'place',
  label: 'Yer',
  glyph: 'pin',
  group: 'place',
  color: GROUP_COLORS.place,
}

/** The first key we know among `keys`, with its label, glyph and colour. */
export function categoryInfo(
  ...keys: (string | undefined)[]
): CategoryInfo | undefined {
  const key = keys.find((k) => k && Object.hasOwn(CATEGORIES, k))
  if (!key) return undefined
  const category = CATEGORIES[key]
  return { ...category, key, color: GROUP_COLORS[category.group] }
}

/** Turkish label for the first key we know, else a readable form of the first key. */
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
