<img src="public/logo.svg" width="64" alt="" />

# MapVerse

MapLibre GL JS ile yapılmış bir keşif ve gezi haritası.

**Canlı:** https://mapverse.github.io/MapVerse/

## Özellikler

- OpenFreeMap vektör verisi üzerinde kendi harita stilimiz: sıcak açık zemin, mavi su, yeşil parklar, renkli semt tonları ve sarı otoyollar; API anahtarı gerekmez
- Koyu mod: harita, mekân rozetleri, rotalar ve tüm arayüz koyu temaya geçer. Sağ üstteki profil menüsünden Açık, Koyu ya da cihaza uyan Sistem seçilir ve seçim hatırlanır
- Harita tasarımları: profil menüsünden Standart, Eski harita (parşömen zemin, mürekkep yazılar, okr otoyollar) ya da GTA San Andreas'ın radarından esinlenen San Andreas (tozlu çöl zemini, zeytin yeşili çimen, gri asfalt, siyah çerçeveli beyaz büyük harfli yazılar, 3B arazide turuncu puslu gökyüzü) seçilir. San Andreas'ta her şey oyunun radarı gibidir: mekânlar siyah çerçeveli kare bliplerdir, seçilenler ve arama sonuçları sarı çerçeveli hedef blipi olur, konumun beyaz oyuncu okuyla, rota siyah kenarlı sarı çizgiyle, rotanın başı beyaz ve sonu kırmızı blip olarak, seçilen alan yeşil çete bölgesi gibi çizilir; pusula N harfine döner. Arayüz de oyunun menüleri gibi siyah, köşeli panellere ve sarı vurgulara geçer; sağ üstte oyundaki gibi saat durur ve haritayı yeni bir semte kaydırınca semtin adı sağ altta oyundaki gibi belirip kaybolur. Her tasarımın açık ve koyu hâli var, koyu modda San Andreas gecesinin mor-mavi sokaklarına geçer; seçim hatırlanır
- Haritayı yatırıp binaları 3B gösteren 2D/3D düğmesi
- Simge yapıların 3B modelleri: Ankara'da Anıtkabir (Şeref Holü, Tören Meydanı, kuleler ve Aslanlı Yol ile bütün olarak), Ankara Kalesi (burçlu surları ve Akkale ile), Atakule (AVM'si, çatı bahçesi ve cam asansörüyle), AŞTİ (terminali ve peronlarıyla), Batıkent'te Atlantis AVM (yeşil çatılı, cam tonozlu hilal biçimli ana binası, bulvarı aşan kırmızı saçağı, Eğlence Merkezi, bulvarın üstünden batı yakası boyunca uzanan su kanallı, çimenli, ağaçlı ve kafeli platformu ve Atlantis City'nin 24 katlı sekiz konut bloğuyla) ve Kocatepe Camii; İstanbul'da Ayasofya, Sultanahmet Camii, Galata Kulesi, Kız Kulesi, Beyazıt Kulesi, Dolmabahçe Saat Kulesi, Rumeli Hisarı, Çamlıca Kulesi, Sabancı Center, İstanbul Sapphire, Ali Sami Yen Spor Kompleksi RAMS Park (çizgili çim sahası ve kale direkleriyle, kırmızı-sarı koltuklu iki kademeli tribünleri ve localar katıyla, cam ve brüt beton payeli cephesi ve sarı saçaklı kapılarıyla, ortası açık, dikişli çatısıyla ve etrafındaki meydanıyla) ve 15 Temmuz Şehitler Köprüsü; İzmir'de Konak Saat Kulesi; Edirne'de Selimiye Camii. Her biri OpenStreetMap'teki gerçek yerinde ve ayak izine göre, haritanın o yapıya ait sade binalarının yerine çizilir; haritanın kendi binaları gibi zoom 15'ten itibaren yerden yükselerek belirir, daha uzaktan bakınca yerlerinde sade bina izleri görünür. Köprüden geçen rotalar suyun üstünde değil, köprünün tabliyesinde çizilir. 3B arazi açıkken yapılar zemine düzgün oturur: tek parça yapılar merkezlerindeki zeminde düz durur, surlar yamaca tırmanır, köprü denizden ölçülür. Koyu modda gece ışıklandırmasıyla görünürler: taş cepheler projektörle aydınlatılmış gibi tabanda daha parlak, pencereler yanık, Aslanlı Yol'da lambalar yanar, köprünün kabloları LED gibi parlar ve çevrelerinde yere düşen ışık halkaları olur; RAMS Park'ın meydanındaki projektörler ise gökyüzünü ağır ağır tarar: çoğu beyaz, aralarında sarı ve kırmızı, eğilip doğrularak birbirini kesen yumuşak ışık huzmeleri (hareket azaltma tercihinde sabit durur, görünmeyince çizilmez)
- Yakınlaşınca site ve sanayi sitesi adları: harita karolarında olmayan bu adlar görünen alan için OpenStreetMap'ten (Overpass) alınır ve saklanır
- Yakınlaşınca trafik lambaları, ince grafit gövdeli ve parlayan lambalı ikonlarla: kavşaklardakiler ve daha küçük olarak ışıklı yaya geçitlerindekiler. Harita karolarında olmadıkları için görünen alan için OpenStreetMap'ten (Overpass) alınır; bir kavşakta birbirine yakın olanlardan biri gösterilir
- 3B arazi: dağlar ve tepeler yükseltisiyle, gölgeli kabartmayla görünür ([Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), API anahtarı gerekmez). Profil menüsünden açılıp kapanır ve seçim hatırlanır
- Yakınlaştırma, pusula/eğim, konumum ve ölçek kontrolleri
- Yer ve adres arama ([Photon](https://photon.komoot.io)): ekrandaki alana göre öncelikli öneriler, uzaklık bilgisi, klavyeyle seçim ve son aramalar
- Aramaya tıklayınca kategoriler: restoran, kafe, market, eczane, akaryakıt, ATM, otel, hastane, park, müze, otopark ve cami. Seçilen türde en yakın yerler uzaklığa göre listelenir ve haritada işaretlenir ([Overpass API](https://overpass-api.de), API anahtarı gerekmez)
- İl, ilçe ya da semt gibi alan sonuçlarında alan sınırının çizilmesi ([Nominatim](https://nominatim.openstreetmap.org))
- Mekânlar tek tıkla: fareyle bir mekânın üstünde biraz durunca simgesi yerinden zıplayarak büyür, kategori renginde bir dalga yayar ve ad, kategori ve adresle küçük bir önizleme kartı açılır; imleç ayrılınca kaybolur. Tıklayınca simge kendi renginde bir iğneye dönüşüp yerinden sıçrar, yere ezilerek oturur ve zemine bir halka yayar; mekân bir alansa (park, bahçe, oyun parkı, okul, üniversite, hastane, stadyum, mezarlık, cami, müze, otopark, AVM gibi) alanın kendisi de kendi renginde bir an parlayıp hafif bir dolgu ve kenar çizgisiyle belirir, kapatınca söner; alan OpenStreetMap'ten (Overpass) bulunur, adı olmayan bir park bile mekânın bulunduğu, türüne uyan en küçük alan olarak seçilir; ayrıntılar da hemen solda bir panelde açılır: şu an açık mı kapalı mı ve ne zamana kadar, bugünün ve haftanın çalışma saatleri, adres, telefon, web sitesi, e-posta, mutfak, açıklama, Vikipedi bağlantısı, koordinat (kopyalanır) ve Wi-Fi, paket servis, dış mekân, engelli erişimi gibi olanaklar; Yol tarifi ve Paylaş düğmeleri ve OpenStreetMap bağlantısı. Panel mekânı örtüyorsa harita onu açıkta kalacak şekilde kayar. Telefonda ayrıntılar alttan yükselen bir sayfada açılır, mekân sayfayla arama kutusu arasında kalır; aşağı çekince sayfa yalnızca üst kısmına (ad, açık mı, düğmeler) iner, yukarı çekince ya da dokununca yeniden açılır; sayfa parmağı takip eder, bırakınca yaylanarak yerine oturur, açıkken harita düğmeleri çekilir.
- Haritada boş bir yere tıklayınca (Google Haritalar'daki gibi) oraya kırmızı bir iğne düşer ve altta küçük bir kart yükselir: oranın adresi (bina ya da yer adı, yoksa cadde ve kapı numarası), mahallesi, ilçesi ve şehri, kopyalanabilen koordinatı; Yol tarifi ve Paylaş. Tıklanan yer kartın altında kalacaksa harita onu yukarı kaydırır. Çift tıklama yalnızca yakınlaştırır, kart açmaz.
- Tıklamalar birer birer: bir mekân ya da nokta açıkken haritada başka bir yere (başka bir mekâna bile) tıklamak yalnızca onu kapatır, iğne geri çekilir; sonraki tıklama yeniden açar. Haritayı sürüklemek açık olanı kapatmaz, Esc kapatır. Fare imleci de buna göre: haritada ok, tıklayınca açılacak bir mekânın üstünde parmak, harita sürüklenirken kapalı el (açık el yerine; tıklamada el yanıp sönmez); bir şey açıkken mekânların üstünde de ok kalır, çünkü tıklama yalnızca kapatır. Bilgiler OpenStreetMap'ten (Overpass) ve Photon'dan gelir, yüklenirken parlayan iskeletler görünür; bir kez gelen adres ve bilgiler yeniden açılınca beklemeden görünür. Kartlar hep aynı boyda kalır, geç gelen bilgi hiçbir şeyi kaydırmaz; animasyonlar yalnızca transform ve opaklıkla yapılır, harita üstündeki kartlarda bulanık cam yerine düz yüzey kullanılır, böylece açılıp kapanırken takılma olmaz. Profil menüsü, arama önerileri ve yol tarifi paneli de açılıp kapanırken canlanır; hareket azaltma tercihinde animasyonlar kapanır
- Telefona göre: dar ekranlarda arama kutusu kısa bir ipucu gösterir ("Burada ara"), yol tarifi alanları ve düğmeleri en dar telefonda da birbirine binmez; yazı alanları 16 px olduğundan telefon tarayıcısı dokununca sayfayı yakınlaştırmaz; kapatma, temizleme ve eylem düğmeleri parmakla rahat basılacak büyüklüktedir. Ana ekrana eklenip uygulama gibi açıldığında ekranın tamamını kullanır, arayüz çentiğe, köşelere ve alttaki ev çubuğuna girmez. Profil menüsü ya da arama açıkken haritaya dokunmak yalnızca onları kapatır, altta bir şey açmaz.
- Uygulama içinde yol tarifi ([Valhalla](https://valhalla.github.io/valhalla/)): araba, yürüyüş ve bisiklet (seçili mod kayan bir hapla işaretlenir); başlangıç ve varış alanlarına doğrudan yazılarak aranır, öneriler arasında Konumum ve Haritadan seç de vardır, uçlar tek dokunuşla yer değiştirir. Alternatif rotalar süre, mesafe, varış saati ve hangi caddeden geçtiğiyle kartlarda listelenir, Önerilen ve Daha kısa etiketleri alır; seçilen rota haritada baştan sona çizilerek gelir, varış iğnesi yerine düşer. Türkçe adım adım tarifte bir adıma tıklayınca harita o dönemece yaklaşır. Telefonda planlayıcı üstte, rotalar alttan açılan bir sayfada durur: kartlar yana kaydırılır, sayfa yukarı çekilince (ya da başlığına dokununca) adımlar açılır, bir adım seçilince önceki ve sonraki dönemece geçen bir adım gezgini ve Tüm rota düğmesi çıkar; haritadan nokta seçerken harita ortadaki iğnenin altına kaydırılır. Esc nokta seçmeyi bırakır ya da yol tarifini kapatır. Arama çubuğundaki rota düğmesiyle de açılır
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
