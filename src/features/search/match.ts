/**
 * Where `query` occurs in `text`, ignoring case: the Turkish way first
 * (İ/i, I/ı), then the plain way, so "ikea" still finds "IKEA".
 */
export function findMatch(
  text: string,
  query: string,
): [number, number] | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  for (const lower of [
    (s: string) => s.toLocaleLowerCase('tr'),
    (s: string) => s.toLowerCase(),
  ]) {
    const found = matchWith(text, lower(trimmed), lower)
    if (found) return found
  }
  return null
}

/**
 * Finds `needle` in `text` lowered by `lower`, a character at a time, so
 * a character that lowers to two (as İ does, the plain way) still maps
 * back to where it stands in `text`.
 */
function matchWith(
  text: string,
  needle: string,
  lower: (s: string) => string,
): [number, number] | null {
  let lowered = ''
  // For each code unit of `lowered`, where its character starts in `text`
  const from: number[] = []
  for (let i = 0; i < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(i)!)
    const low = lower(char)
    lowered += low
    for (let k = 0; k < low.length; k++) from.push(i)
    i += char.length
  }
  from.push(text.length)
  const start = lowered.indexOf(needle)
  if (start === -1) return null
  const last = start + needle.length - 1
  // Up to the end of the character the match ends in
  const endChar = from[last]
  const end = endChar + String.fromCodePoint(text.codePointAt(endChar)!).length
  return [from[start], end]
}
