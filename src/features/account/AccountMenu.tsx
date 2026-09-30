import { useControl } from '@vis.gl/react-maplibre'
import type { ControlPosition, IControl } from 'maplibre-gl'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons/Icon.tsx'
import SettingsSections from '../settings/SettingsSections.tsx'
import Avatar from './Avatar.tsx'
import { setProfile, squarePhoto, useProfile } from './profile.ts'
import './AccountMenu.css'

/** An empty map control, for React to render the menu into. */
class Slot implements IControl {
  readonly container = document.createElement('div')

  onAdd() {
    this.container.className = 'maplibregl-ctrl mv-account'
    return this.container
  }

  onRemove() {
    this.container.remove()
  }
}

/**
 * The profile button in the corner, and its menu: signing in (a name and a
 * photo, kept on this device) and the app's settings.
 */
export default function AccountMenu({
  position,
}: {
  position: ControlPosition
}) {
  const slot = useControl(() => new Slot(), { position })
  const profile = useProfile()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const panelId = useId()
  const title = profile ? profile.name : 'Giriş yap'

  // Close on Escape or on a click anywhere else
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!slot.container.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, slot])

  function signIn(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setProfile({ name: trimmed })
    setName('')
  }

  async function pickPhoto(file: File | undefined) {
    if (!file || !profile) return
    try {
      setProfile({ ...profile, photo: await squarePhoto(file) })
    } catch {
      // Not an image the browser can read; keep the current one
    }
  }

  return createPortal(
    <>
      <button
        ref={toggleRef}
        type="button"
        className="mv-account-toggle mv-glass"
        title={title}
        aria-label={
          profile
            ? `${profile.name}, profil ve ayarlar`
            : 'Giriş yap ve ayarlar'
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar profile={profile} size={profile ? 36 : 40} />
      </button>
      {open && (
        <section
          id={panelId}
          className="mv-account-panel mv-glass"
          aria-label="Profil ve ayarlar"
        >
          <div className="mv-profile">
            <Avatar profile={profile} size={52} />
            <div className="mv-profile-text">
              <p className="mv-profile-name">{profile?.name ?? 'Misafir'}</p>
              <p className="mv-profile-note">
                {profile ? 'Bu cihazdaki profilin' : 'Giriş yapmadın'}
              </p>
            </div>
          </div>

          {profile ? (
            <div className="mv-profile-actions">
              <button
                type="button"
                // Short on screen, so it fits beside the sign-out button
                title={profile.photo ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
                aria-label={
                  profile.photo ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'
                }
                onClick={() => photoRef.current?.click()}
              >
                <Icon name="camera" size={18} />
                Fotoğraf
              </button>
              <button type="button" onClick={() => setProfile(null)}>
                <Icon name="logout" size={18} />
                Çıkış yap
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void pickPhoto(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
          ) : (
            <form className="mv-sign-in" onSubmit={signIn}>
              <input
                type="text"
                placeholder="Adın"
                aria-label="Adın"
                autoComplete="name"
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" disabled={!name.trim()}>
                Giriş yap
              </button>
              <p className="mv-settings-hint">
                Profilin yalnızca bu cihazda saklanır.
              </p>
            </form>
          )}

          <SettingsSections />
        </section>
      )}
    </>,
    slot.container,
  )
}
