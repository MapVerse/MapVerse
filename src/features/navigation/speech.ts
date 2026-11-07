/** A Turkish voice of the device's, if it has one. */
function turkishVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'tr-TR') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('tr'))
  )
}

const canSpeak = () => typeof speechSynthesis !== 'undefined'

/**
 * Says something in Turkish, if the device can: without a Turkish voice it
 * says nothing, rather than read Turkish out in another language's voice.
 */
export function speak(text: string) {
  if (!text || !canSpeak()) return
  const voice = turkishVoice()
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

/** Tells whether there is a Turkish voice to speak with, now and as the
 *  device's voices come in (they may, a moment after the page loads). */
export function watchVoices(listener: (has: boolean) => void): () => void {
  if (!canSpeak()) {
    listener(false)
    return () => {}
  }
  const check = () => listener(!!turkishVoice())
  check()
  speechSynthesis.addEventListener('voiceschanged', check)
  return () => speechSynthesis.removeEventListener('voiceschanged', check)
}
