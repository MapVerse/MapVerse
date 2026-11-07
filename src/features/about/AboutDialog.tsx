import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { t, useLocale } from '../../i18n/index.ts'
import { formatDate } from '../../i18n/format.ts'
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
  useLocale()
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
          <h2 id={titleId}>{t('about.title')}</h2>
          <button
            type="button"
            className="mv-about-close"
            aria-label={t('common.close')}
            onClick={() => ref.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <p>{t('about.intro')}</p>
        <p className="mv-about-version">
          {t('about.version', { version: __APP_VERSION__ })} ·{' '}
          {__APP_COMMIT__ === 'dev' ? (
            t('about.development')
          ) : (
            <Link href={`${REPO}/commit/${__APP_COMMIT__}`}>
              {__APP_COMMIT__}
            </Link>
          )}
          {!Number.isNaN(built.getTime()) && (
            <> · {formatDate(built, { dateStyle: 'long' })}</>
          )}{' '}
          · <Link href={REPO}>{t('about.source')}</Link>
        </p>

        <h3>{t('about.privacy')}</h3>
        <ul>
          <li>{t('about.noServer')}</li>
          <li>{t('about.local')}</li>
          <li>{t('about.location')}</li>
          <li>
            {t('about.services')}
            <ul>
              <li>
                {t('about.photon')}{' '}
                <Link href="https://www.komoot.com/privacy">
                  Photon ({host(PHOTON_URL)})
                </Link>
              </li>
              <li>
                {t('about.nominatim')}{' '}
                <Link href="https://osmfoundation.org/wiki/Privacy_Policy">
                  Nominatim ({host(NOMINATIM_URL)})
                </Link>
              </li>
              <li>
                {t('about.overpass')}{' '}
                <Link href="https://dev.overpass-api.de/overpass-doc/en/preface/commons.html">
                  Overpass ({overpassHosts})
                </Link>
              </li>
              <li>
                {t('about.valhalla')}{' '}
                <Link href="https://www.fossgis.de/datenschutzerklaerung/">
                  Valhalla ({host(VALHALLA_URL)})
                </Link>
              </li>
              <li>
                {t('about.tiles')}{' '}
                <Link href="https://openfreemap.org/privacy/">
                  OpenFreeMap (tiles.openfreemap.org)
                </Link>
              </li>
            </ul>
            {t('about.servicesSee')}
          </li>
        </ul>

        <h3>{t('about.sources')}</h3>
        <ul>
          <li>
            {t('about.mapData')}{' '}
            <Link href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </Link>{' '}
            {t('about.contributors')}
          </li>
          <li>
            {t('about.tilesBy')}{' '}
            <Link href="https://openfreemap.org">OpenFreeMap</Link>{' '}
            {t('about.and')}{' '}
            <Link href="https://openmaptiles.org">OpenMapTiles</Link>
          </li>
          <li>
            {t('about.elevation')}{' '}
            <Link href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">
              Mapzen Terrain Tiles
            </Link>{' '}
            (AWS Open Data)
          </li>
          <li>
            {t('about.search')}{' '}
            <Link href="https://photon.komoot.io">Photon</Link>,{' '}
            {t('about.outlines')}{' '}
            <Link href="https://nominatim.org">Nominatim</Link>,{' '}
            {t('about.places')}{' '}
            <Link href="https://overpass-api.de">Overpass API</Link>,{' '}
            {t('about.routes')}{' '}
            <Link href="https://valhalla.github.io/valhalla/">Valhalla</Link>{' '}
            {t('about.fossgis')}
          </li>
        </ul>

        <h3>{t('about.deviceData')}</h3>
        {step === 'idle' && (
          <button
            type="button"
            className="mv-about-delete"
            onClick={() => setStep('confirm')}
          >
            <Icon name="trash" size={18} />
            {t('about.delete')}
          </button>
        )}
        {step === 'confirm' && (
          <div
            className="mv-about-confirm"
            role="group"
            aria-label={t('about.confirmDelete')}
          >
            <p>{t('about.deleteWarning')}</p>
            <div className="mv-about-confirm-actions">
              <button
                type="button"
                className="mv-about-delete is-confirm"
                onClick={deleteData}
              >
                {t('about.deleteYes')}
              </button>
              <button type="button" onClick={() => setStep('idle')}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        <p className="mv-about-status" role="status">
          {step === 'done' && t('about.deleted')}
        </p>
      </div>
    </dialog>
  )
}
