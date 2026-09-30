<img src="public/logo.svg" width="64" alt="" />

# MapVerse

MapLibre GL JS ile yapılmış bir keşif ve gezi haritası.

**Canlı:** https://mapverse.github.io/MapVerse/

## Özellikler

- OpenFreeMap vektör verisi üzerinde kendi harita stilimiz: sıcak açık zemin, mavi su, yeşil parklar, renkli semt tonları ve sarı otoyollar; API anahtarı gerekmez
- Koyu mod: harita, mekân rozetleri, rotalar ve tüm arayüz koyu temaya geçer. Sağ üstteki profil menüsünden Açık, Koyu ya da cihaza uyan Sistem seçilir ve seçim hatırlanır
- Haritayı yatırıp binaları 3B gösteren 2D/3D düğmesi
- Simge yapıların 3B modelleri: Ankara'da Anıtkabir (Şeref Holü, Tören Meydanı, kuleler ve Aslanlı Yol ile bütün olarak), Ankara Kalesi (burçlu surları ve Akkale ile), Atakule (AVM'si, çatı bahçesi ve cam asansörüyle), AŞTİ (terminali ve peronlarıyla) ve Kocatepe Camii; İstanbul'da Ayasofya, Sultanahmet Camii, Galata Kulesi, Kız Kulesi, Beyazıt Kulesi, Dolmabahçe Saat Kulesi, Rumeli Hisarı, Çamlıca Kulesi, Sabancı Center, İstanbul Sapphire ve 15 Temmuz Şehitler Köprüsü; İzmir'de Konak Saat Kulesi; Edirne'de Selimiye Camii. Her biri OpenStreetMap'teki gerçek yerinde ve ayak izine göre, haritanın o yapıya ait sade binalarının yerine çizilir. Köprüden geçen rotalar suyun üstünde değil, köprünün tabliyesinde çizilir. 3B arazi açıkken yapılar zemine düzgün oturur: tek parça yapılar merkezlerindeki zeminde düz durur, surlar yamaca tırmanır, köprü denizden ölçülür. Koyu modda gece ışıklandırmasıyla görünürler: taş cepheler projektörle aydınlatılmış gibi tabanda daha parlak, pencereler yanık, Aslanlı Yol'da lambalar yanar, köprünün kabloları LED gibi parlar ve çevrelerinde yere düşen ışık halkaları olur
- Yakınlaşınca site ve sanayi sitesi adları: harita karolarında olmayan bu adlar görünen alan için OpenStreetMap'ten (Overpass) alınır ve saklanır
- 3B arazi: dağlar ve tepeler yükseltisiyle, gölgeli kabartmayla görünür ([Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), API anahtarı gerekmez). Profil menüsünden açılıp kapanır ve seçim hatırlanır
- Yakınlaştırma, pusula/eğim, konumum ve ölçek kontrolleri
- Yer ve adres arama ([Photon](https://photon.komoot.io)): ekrandaki alana göre öncelikli öneriler, uzaklık bilgisi, klavyeyle seçim ve son aramalar
- Aramaya tıklayınca kategoriler: restoran, kafe, market, eczane, akaryakıt, ATM, otel, hastane, park, müze, otopark ve cami. Seçilen türde en yakın yerler uzaklığa göre listelenir ve haritada işaretlenir ([Overpass API](https://overpass-api.de), API anahtarı gerekmez)
- İl, ilçe ya da semt gibi alan sonuçlarında alan sınırının çizilmesi ([Nominatim](https://nominatim.openstreetmap.org))
- Haritadaki mekânlara tıklayınca simgenin yerinde büyümesi ve ad, kategori, adres içeren kart
- Uygulama içinde yol tarifi ([Valhalla](https://valhalla.github.io/valhalla/)): araba, yürüyüş ve bisiklet; alternatif rotalar; Türkçe adım adım tarif; başlangıç ve varış için konumun, aradığın yer ya da haritada seçtiğin nokta. Arama çubuğundaki rota düğmesiyle de açılır
- Uygulamaya özel çizilmiş ikon seti: kategori renkleriyle harita rozetleri, iki tonlu kategori sembolleri ve arayüz için çizgi ikonlar
- Sağ üstte profil: adınla giriş yapıp fotoğraf ekleyebilirsin (yalnızca bu cihazda saklanır); aynı menüde tema, 3B arazi ve son aramaları temizleme
- Liquid glass tarzı arama kutusu ve gruplanmış harita düğmeleri: yakınlaştırma, pusula ile 3B görünüm ve konumum ayrı kapsüllerde
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
- [x] Koyu mod ve ayarlar
- [x] Arama (Photon)
- [ ] İşaretler ve popup (localStorage, GeoJSON dışa/içe aktarma)
- [x] 3D binalar ve arazi
- [ ] Mobil cila ve uçtan uca test

## Atıflar

Harita verisi © [OpenStreetMap](https://www.openstreetmap.org/copyright) katkıcıları.
Tile'lar [OpenFreeMap](https://openfreemap.org) ve [OpenMapTiles](https://openmaptiles.org) ile sunulur.
Yükselti verisi [Mapzen Terrain Tiles](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) (AWS Open Data) üzerinden gelir.
