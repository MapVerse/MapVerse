# MapVerse

MapLibre GL JS ile yapılmış bir keşif ve gezi haritası.

## Özellikler

- OpenFreeMap vektör altlığı (Liberty stili), API anahtarı gerekmez
- Yakınlaştırma, pusula/eğim, konumum ve ölçek kontrolleri
- Harita konumu URL'de tutulur (`#zoom/enlem/boylam`), link paylaşınca aynı görünüm açılır

## Geliştirme

Node.js 22.12 veya üstü gerekir.

```bash
npm install
npm run dev           # geliştirme sunucusu
npm run build         # tip kontrolü + üretim derlemesi
npm run lint          # oxlint
npm run format        # prettier
```

## Yol haritası

- [x] İskelet: tam ekran harita, kontroller, CI
- [ ] Stil değiştirici ve koyu mod
- [ ] Arama (Photon)
- [ ] İşaretler ve popup (localStorage, GeoJSON dışa/içe aktarma)
- [ ] 3D binalar ve arazi
- [ ] Mobil cila, uçtan uca test, GitHub Pages yayını

## Atıflar

Harita verisi © [OpenStreetMap](https://www.openstreetmap.org/copyright) katkıcıları.
Tile'lar [OpenFreeMap](https://openfreemap.org) ve [OpenMapTiles](https://openmaptiles.org) ile sunulur.
