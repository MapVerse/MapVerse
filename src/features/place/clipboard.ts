/**
 * Copies text, saying whether it worked: through the Clipboard API where
 * there is one and it is allowed, or else the old way, through a hidden
 * text box (as on plain http, or in browsers without the API).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Refused (no permission, the page not focused…): try the old way
  }
  return copyTheOldWay(text)
}

function copyTheOldWay(text: string): boolean {
  const box = document.createElement('textarea')
  box.value = text
  box.setAttribute('readonly', '')
  box.style.cssText =
    'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  const focused = document.activeElement
  document.body.append(box)
  box.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  box.remove()
  if (focused instanceof HTMLElement) focused.focus({ preventScroll: true })
  return copied
}
