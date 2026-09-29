/** Where `query` occurs in `text`, ignoring case the Turkish way (İ/i, I/ı). */
export function findMatch(
  text: string,
  query: string,
): [number, number] | null {
  const needle = query.trim().toLocaleLowerCase('tr')
  if (!needle) return null
  const start = text.toLocaleLowerCase('tr').indexOf(needle)
  return start === -1 ? null : [start, start + needle.length]
}
