# MapVerse

MapLibre GL JS ile yapılmış bir keşif ve gezi haritası.

**Canlı:** https://mapverse.github.io/MapVerse/

## Özellikler

- OpenFreeMap vektör verisi üzerinde kendi harita stilimiz: açık gri zemin, beyaz yollar ve beyaz 3B binalar; API anahtarı gerekmez
- Haritayı yatırıp binaları 3B gösteren düğme
- Yakınlaştırma, pusula/eğim, konumum ve ölçek kontrolleri
- Yer ve adres arama ([Photon](https://photon.komoot.io)): ekrandaki alana göre öncelikli öneriler, uzaklık bilgisi, klavyeyle seçim ve son aramalar
- İl, ilçe ya da semt gibi alan sonuçlarında alan sınırının çizilmesi ([Nominatim](https://nominatim.openstreetmap.org))
- Haritadaki mekânlara tıklayınca simgenin yerinde büyümesi ve ad, kategori, adres içeren kart
- Uygulama içinde yol tarifi ([Valhalla](https://valhalla.github.io/valhalla/)): araba, yürüyüş ve bisiklet; alternatif rotalar; Türkçe adım adım tarif; başlangıç ve varış için konumun, aradığın yer ya da haritada seçtiğin nokta. Arama çubuğundaki rota düğmesiyle de açılır
- Uygulamaya özel çizilmiş ikon seti: kategori renkleriyle harita rozetleri, iki tonlu kategori sembolleri ve arayüz için çizgi ikonlar
- Harita konumu URL'de tutulur (`#zoom/enlem/boylam`), link paylaşınca aynı görünüm açılır

## Geliştirme

Node.js 22.12 veya üstü gerekir.

```bash
npm install
npm run dev           # geliştirme sunucusu
npm run build         # tip kontrolü + üretim derlemesi
npm run lint          # oxlint
npm test              # vitest
npm run format        # prettier
```

Rotalar varsayılan olarak FOSSGIS'in herkese açık Valhalla sunucusundan (`valhalla1.openstreetmap.de`) alınır. Bu sunucu düşük hacimli kullanım içindir; kendi Valhalla sunucunu kullanmak için derlemeden önce `VITE_VALHALLA_URL` değişkenini tanımla.

## Yol haritası

- [x] İskelet: tam ekran harita, kontroller, CI, GitHub Pages yayını
- [ ] Stil değiştirici ve koyu mod
- [x] Arama (Photon)
- [ ] İşaretler ve popup (localStorage, GeoJSON dışa/içe aktarma)
- [ ] 3D binalar ve arazi
- [ ] Mobil cila ve uçtan uca test

## Atıflar

Harita verisi © [OpenStreetMap](https://www.openstreetmap.org/copyright) katkıcıları.
Tile'lar [OpenFreeMap](https://openfreemap.org) ve [OpenMapTiles](https://openmaptiles.org) ile sunulur.
