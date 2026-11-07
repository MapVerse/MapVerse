import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { t, useLocale } from '../../i18n/index.ts'
import { Icon } from '../../icons/Icon.tsx'
import type { Place } from '../place/place.ts'
import {
  KIND_ICONS,
  LABEL_MAX,
  kindLabel,
  type FavoriteKind,
} from './favorites.ts'
import {
  removeFavorite,
  renameFavorite,
  saveFavorite,
  useFavorite,
} from './useFavorites.ts'
import './SaveButton.css'

const KINDS: FavoriteKind[] = ['star', 'home', 'work']

type Props = {
  place: Place
  /** A bare point on the map, rather than a place */
  point?: boolean
  /** Only its icon, where the row is short of room */
  compact?: boolean
  /** The editor opened, to make room for it */
  onOpen?: () => void
}

/**
 * Saves a place: one press stars it, and opens a small editor under the
 * row to save it as home or work instead, give it a name of one's own or
 * take it off the list again.
 */
export default function SaveButton({ place, point, compact, onOpen }: Props) {
  useLocale()
  const saved = useFavorite(place)
  const [open, setOpen] = useState(false)
  const editorId = useId()
  const label = saved
    ? t('saved.savedAs', { kind: kindLabel(saved.kind) })
    : t('saved.save')

  useEffect(() => {
    if (open) onOpen?.()
    // Only as it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function press() {
    if (!saved) saveFavorite(place, 'star', { point })
    setOpen((o) => !o || !saved)
  }

  function pick(kind: FavoriteKind) {
    saveFavorite(place, kind, {
      point,
      label: kind === 'star' ? (saved?.label ?? '') : undefined,
    })
  }

  function onKeyDown(event: KeyboardEvent) {
    // Escape folds the editor away, and closes nothing else
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`save-button${saved ? ` is-saved is-${saved.kind}` : ''}${
          compact ? ' is-compact' : ''
        }`}
        // Its label may be hidden on a narrow screen (see SaveButton.css)
        aria-label={label}
        title={compact ? label : undefined}
        aria-expanded={open}
        aria-controls={open ? editorId : undefined}
        onClick={press}
      >
        <Icon
          name={KIND_ICONS[saved?.kind ?? 'star']}
          size={compact ? 17 : 18}
        />
        {!compact && (
          <span className="save-button-label" aria-hidden="true">
            {t(saved ? 'saved.saved' : 'saved.save')}
          </span>
        )}
      </button>
      {open && saved && (
        <div
          id={editorId}
          className="save-editor"
          role="group"
          aria-label={t('saved.one')}
          onKeyDown={onKeyDown}
        >
          <div className="save-kinds" role="group" aria-label={t('saved.as')}>
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={saved.kind === kind}
                onClick={() => pick(kind)}
              >
                <Icon name={KIND_ICONS[kind]} size={16} />
                {kindLabel(kind)}
              </button>
            ))}
          </div>
          {saved.kind === 'star' && (
            <input
              type="text"
              className="save-name"
              aria-label={t('saved.ownName')}
              placeholder={t('saved.ownName')}
              maxLength={LABEL_MAX}
              defaultValue={saved.label ?? ''}
              onChange={(event) =>
                renameFavorite(saved.key, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') setOpen(false)
              }}
            />
          )}
          <div className="save-editor-actions">
            <button
              type="button"
              className="save-remove"
              onClick={() => {
                removeFavorite(saved.key)
                setOpen(false)
              }}
            >
              <Icon name="trash" size={16} />
              {t('common.remove')}
            </button>
            <button type="button" onClick={() => setOpen(false)}>
              {t('saved.done')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
