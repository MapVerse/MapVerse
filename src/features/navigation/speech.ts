import type { Locale } from '../../i18n/index.ts'

/** The device's voice for each language: its own region first. */
const VOICE_LANGS: Record<Locale, { lang: string; prefix: string }> = {
  tr: { lang: 'tr-TR', prefix: 'tr' },
  en: { lang: 'en-US', prefix: 'en' },
}

/** A voice of the device's in a language, if it has one. */
function voiceFor(locale: Locale): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices()
  const { lang, prefix } = VOICE_LANGS[locale]
  // English as the browser itself prefers it (en-GB, en-AU…), if it has one
  const preferred =
    locale === 'en'
      ? navigator.languages?.find((l) => /^en-/i.test(l))
      : undefined
  return (
    (preferred && voices.find((v) => v.lang === preferred)) ||
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
  )
}

const canSpeak = () => typeof speechSynthesis !== 'undefined'

/**
 * Says something in a language, if the device can: without a voice for it
 * it says nothing, rather than read it out in another language's voice.
 */
export function speak(text: string, locale: Locale = 'tr') {
  if (!text || !canSpeak()) return
  const voice = voiceFor(locale)
  if (!voice) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  speechSynthesis.speak(utterance)
}

/** Stops whatever is being said, and what waits to be. */
export function hush() {
  if (canSpeak()) speechSynthesis.cancel()
}

/** Tells whether there is a voice to speak a language with, now and as
 *  the device's voices come in (they may, a moment after the page loads). */
export function watchVoices(
  listener: (has: boolean) => void,
  locale: Locale = 'tr',
): () => void {
  if (!canSpeak()) {
    listener(false)
    return () => {}
  }
  const check = () => listener(!!voiceFor(locale))
  check()
  speechSynthesis.addEventListener('voiceschanged', check)
  return () => speechSynthesis.removeEventListener('voiceschanged', check)
}
