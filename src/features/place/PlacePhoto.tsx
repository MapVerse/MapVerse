import { useEffect, useState } from 'react'
import { t } from '../../i18n/index.ts'
import {
  fetchPhoto,
  knownPhoto,
  photoSource,
  type Photo,
  type PhotoSource,
} from './photo.ts'
import './PlacePhoto.css'

/** A place's photo, once found: undefined while it is looked for. */
function usePhoto(source: PhotoSource | undefined): Photo | null | undefined {
  const [found, setFound] = useState<{
    source: PhotoSource
    photo: Photo | null
  }>()
  useEffect(() => {
    if (!source) return
    let current = true
    fetchPhoto(source)
      .then((photo) => current && setFound({ source, photo }))
      .catch(() => current && setFound({ source, photo: null }))
    return () => {
      current = false
    }
  }, [source])
  if (!source) return null
  return found?.source === source ? found.photo : knownPhoto(source)
}

/**
 * A photo of the place from Wikimedia Commons, where its tags lead to one
 * (a Commons file, or its Wikidata item's image), at the top of its
 * details, with whom to credit and the licence, linked to the file's page.
 * Its box keeps one shape, so nothing moves as the photo comes in; where
 * there turns out to be none, the box goes.
 */
export default function PlacePhoto({
  tags,
  name,
}: {
  tags: Record<string, string>
  /** The place's name, to say what the photo shows */
  name: string
}) {
  const [source] = useState(() => photoSource(tags))
  const photo = usePhoto(source)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  if (photo === null || failed) return null
  const credit =
    photo && [photo.author, photo.license].filter(Boolean).join(' · ')
  return (
    <figure
      className={`place-photo${loaded ? ' is-loaded' : ''}`}
      aria-busy={!loaded || undefined}
    >
      {photo && (
        <img
          src={photo.src}
          alt={name}
          width={photo.width}
          height={photo.height || undefined}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {photo && (
        <figcaption>
          <a href={photo.page} target="_blank" rel="noopener noreferrer">
            {credit ? t('place.photoBy', { credit }) : 'Wikimedia Commons'}
          </a>
        </figcaption>
      )}
    </figure>
  )
}
