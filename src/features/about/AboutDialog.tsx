import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../../icons/Icon.tsx'
import {
  NOMINATIM_URL,
  OVERPASS_URLS,
  PHOTON_URL,
  VALHALLA_URL,
} from '../../lib/endpoints.ts'
import { setAboutOpen, useAboutOpen } from './aboutOpen.ts'
import { clearLocalData } from './localData.ts'
import './About.css'

const REPO = 'https://github.com/MapVerse/MapVerse'

const host = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** What the app is, where its data comes from, and what goes where. */
export default function AboutDialog() {
  const open = useAboutOpen()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) return
    // Escape closes this and only this: heard before anything under it,
    // such as the profile menu, which would take it for itself
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  function onClose() {
    setAboutOpen(false)
    if (step === 'confirm') setStep('idle')
  }

  function deleteData() {
    clearLocalData()
    setStep('done')
    // What is held in memory goes too, with the page
    setTimeout(() => window.location.reload(), 1200)
  }

  const built = new Date(__APP_BUILT__)
  const overpassHosts = [...new Set(OVERPASS_URLS.map(host))].join(', ')

  return (
    <dialog
      ref={ref}
      className="mv-about mv-glass"
      aria-labelledby={titleId}
      onClose={onClose}
      // A press on the backdrop, outside the box, closes it
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close()
      }}
    >
      <div className="mv-about-body">
        <header className="mv-about-head">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={40} />
          <h2 id={titleId}>Hakkında ve gizlilik</h2>
          <button
            type="button"
            className="mv-about-close"
            aria-label="Kapat"
            onClick={() => ref.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <p>
          MapVerse, OpenStreetMap verisiyle yapılmış açık kaynaklı bir keşif ve
          gezi haritası: yer ve adres arama, mekân bilgileri ve yol tarifi.
          Hesap gerekmez, reklam ya da izleme yoktur.
        </p>
        <p className="mv-about-version">
          Sürüm {__APP_VERSION__} ·{' '}
          {__APP_COMMIT__ === 'dev' ? (
            'geliştirme'
          ) : (
            <Link href={`${REPO}/commit/${__APP_COMMIT__}`}>
              {__APP_COMMIT__}
            </Link>
          )}
          {!Number.isNaN(built.getTime()) && (
            <> · {built.toLocaleDateString('tr-TR', { dateStyle: 'long' })}</>
          )}{' '}
          · <Link href={REPO}>Kaynak kodu</Link>
        </p>

        <h3>Gizlilik</h3>
        <ul>
          <li>
            Bizim bir sunucumuz ya da hesap sistemimiz yok; sana ait hiçbir şey
            bize gelmez.
          </li>
          <li>
            Profilin, ayarların, favorilerin ve son aramaların yalnızca bu
            tarayıcıda (localStorage) durur.
          </li>
          <li>
            Konumun yalnızca sen istediğinde, bu cihazda kullanılır; hiçbir yere
            kaydedilmez.
          </li>
          <li>
            Haritayı göstermek ve aradığını bulmak için bazı bilgiler doğrudan
            tarayıcından şu açık servislere gider:
            <ul>
              <li>
                Arama metni ve haritanın baktığı yer:{' '}
                <Link href="https://www.komoot.com/privacy">
                  Photon ({host(PHOTON_URL)})
                </Link>
              </li>
              <li>
                Seçilen alanın sınırı:{' '}
                <Link href="https://osmfoundation.org/wiki/Privacy_Policy">
                  Nominatim ({host(NOMINATIM_URL)})
                </Link>
              </li>
              <li>
                Mekân bilgileri ve yakındaki yerler için harita alanı:{' '}
                <Link href="https://dev.overpass-api.de/overpass-doc/en/preface/commons.html">
                  Overpass ({overpassHosts})
                </Link>
              </li>
              <li>
                Rotanın başlangıç ve varış noktaları:{' '}
                <Link href="https://www.fossgis.de/datenschutzerklaerung/">
                  Valhalla ({host(VALHALLA_URL)})
                </Link>
              </li>
              <li>
                Harita karoları:{' '}
                <Link href="https://openfreemap.org/privacy/">
                  OpenFreeMap (tiles.openfreemap.org)
                </Link>
              </li>
            </ul>
            Bu servisler, her web sitesi gibi, isteğin geldiği IP adresini ve
            tarayıcı bilgisini görür.
          </li>
        </ul>

        <h3>Veri kaynakları</h3>
        <ul>
          <li>
            Harita verisi ©{' '}
            <Link href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </Link>{' '}
            katkıcıları (ODbL)
          </li>
          <li>
            Karolar <Link href="https://openfreemap.org">OpenFreeMap</Link> ve{' '}
            <Link href="https://openmaptiles.org">OpenMapTiles</Link>
          </li>
          <li>
            Yükselti{' '}
            <Link href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">
              Mapzen Terrain Tiles
            </Link>{' '}
            (AWS Open Data)
          </li>
          <li>
            Arama <Link href="https://photon.komoot.io">Photon</Link>, alan
            sınırları <Link href="https://nominatim.org">Nominatim</Link>,
            mekânlar <Link href="https://overpass-api.de">Overpass API</Link>,
            rotalar{' '}
            <Link href="https://valhalla.github.io/valhalla/">Valhalla</Link>{' '}
            (FOSSGIS sunucusu)
          </li>
        </ul>

        <h3>Bu cihazdaki veriler</h3>
        {step === 'idle' && (
          <button
            type="button"
            className="mv-about-delete"
            onClick={() => setStep('confirm')}
          >
            <Icon name="trash" size={18} />
            Bu cihazdaki verilerimi sil
          </button>
        )}
        {step === 'confirm' && (
          <div
            className="mv-about-confirm"
            role="group"
            aria-label="Silmeyi onayla"
          >
            <p>
              Profilin, ayarların, favorilerin ve son aramaların bu tarayıcıdan
              silinecek. Bu geri alınamaz.
            </p>
            <div className="mv-about-confirm-actions">
              <button
                type="button"
                className="mv-about-delete is-confirm"
                onClick={deleteData}
              >
                Evet, sil
              </button>
              <button type="button" onClick={() => setStep('idle')}>
                Vazgeç
              </button>
            </div>
          </div>
        )}
        <p className="mv-about-status" role="status">
          {step === 'done' && 'Verilerin silindi. Sayfa yenileniyor…'}
        </p>
      </div>
    </dialog>
  )
}
