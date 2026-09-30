// Path helpers for icons drawn on a 24×24 grid. Every shape winds clockwise,
// so shapes in one path union under the nonzero rule and cut holes under evenodd.

const n = (value: number) => +value.toFixed(3)

/** Rounded rectangle. */
export function rr(x: number, y: number, w: number, h: number, r: number) {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)}Z`
  )
}

/** Circle. */
export function circle(cx: number, cy: number, r: number) {
  return (
    `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 1 ${n(cx + r)} ${n(cy)}` +
    `A${r} ${r} 0 1 1 ${n(cx - r)} ${n(cy)}Z`
  )
}
