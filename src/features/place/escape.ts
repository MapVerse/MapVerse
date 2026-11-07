/**
 * Whether an Escape press is free to close a panel or card: not already
 * taken by something nearer (the search box's list, the account menu…),
 * which marks it with preventDefault, and not pressed while typing in a
 * field or inside the search box or the account menu, which have their
 * own use for it.
 */
export function isFreeEscape(event: KeyboardEvent): boolean {
  if (event.key !== 'Escape' || event.defaultPrevented) return false
  const target = event.target
  if (!(target instanceof Element)) return true
  return !target.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="search"], .mv-account',
  )
}
