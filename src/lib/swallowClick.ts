/** How long after a press its click may come, in ms. */
const CLICK_WITHIN_MS = 700

/**
 * Keeps the click that a press makes from reaching anything: the press was
 * spent closing something, so it should not also open what lies under it
 * (as a place on the map). Dropped if no click comes soon, as when the
 * press turns into a drag.
 */
export function swallowNextClick() {
  const done = () => {
    window.removeEventListener('click', swallow, true)
    clearTimeout(timer)
  }
  const swallow = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    done()
  }
  const timer = setTimeout(done, CLICK_WITHIN_MS)
  window.addEventListener('click', swallow, true)
}

/** Whether a press landed on the map itself, rather than over it. */
export const onMap = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('.maplibregl-canvas-container')
