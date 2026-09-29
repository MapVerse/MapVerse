const LABELS: Record<string, string> = {
  // Result types and OSM place=* values
  country: 'Ülke',
  state: 'İl',
  county: 'İlçe',
  city: 'Şehir',
  town: 'Kasaba',
  village: 'Köy',
  district: 'Semt',
  suburb: 'Semt',
  neighbourhood: 'Mahalle',
  locality: 'Mevki',
  street: 'Yol',
  house: 'Adres',
  // Points of interest (OSM and OpenMapTiles classes)
  restaurant: 'Restoran',
  cafe: 'Kafe',
  fast_food: 'Fast food',
  bar: 'Bar',
  pub: 'Pub',
  ice_cream: 'Dondurmacı',
  bakery: 'Fırın',
  supermarket: 'Süpermarket',
  grocery: 'Market',
  convenience: 'Bakkal',
  shop: 'Mağaza',
  clothes: 'Giyim mağazası',
  clothing_store: 'Giyim mağazası',
  pharmacy: 'Eczane',
  hospital: 'Hastane',
  clinic: 'Klinik',
  doctors: 'Doktor',
  dentist: 'Diş hekimi',
  bank: 'Banka',
  atm: 'ATM',
  fuel: 'Akaryakıt istasyonu',
  parking: 'Otopark',
  bus: 'Otobüs durağı',
  bus_stop: 'Otobüs durağı',
  railway: 'İstasyon',
  station: 'İstasyon',
  ferry_terminal: 'İskele',
  harbor: 'Liman',
  lodging: 'Konaklama',
  hotel: 'Otel',
  hostel: 'Hostel',
  museum: 'Müze',
  art_gallery: 'Sanat galerisi',
  gallery: 'Sanat galerisi',
  attraction: 'Turistik yer',
  viewpoint: 'Seyir noktası',
  castle: 'Kale',
  monument: 'Anıt',
  memorial: 'Anıt',
  place_of_worship: 'İbadethane',
  mosque: 'Cami',
  park: 'Park',
  garden: 'Bahçe',
  playground: 'Oyun parkı',
  stadium: 'Stadyum',
  sports_centre: 'Spor merkezi',
  library: 'Kütüphane',
  school: 'Okul',
  college: 'Yüksekokul',
  university: 'Üniversite',
  cinema: 'Sinema',
  theatre: 'Tiyatro',
  post: 'Postane',
  post_office: 'Postane',
  police: 'Karakol',
  town_hall: 'Belediye',
  cemetery: 'Mezarlık',
  zoo: 'Hayvanat bahçesi',
}

/** Turkish label for the first key we know, else a readable form of the first key. */
export function categoryLabel(
  ...keys: (string | undefined)[]
): string | undefined {
  for (const key of keys) {
    if (key && Object.hasOwn(LABELS, key)) return LABELS[key]
  }
  const first = keys.find((key) => key && key !== 'yes')
  return first && humanize(first)
}

function humanize(key: string) {
  const text = key.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
