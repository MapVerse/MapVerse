import type { CSSProperties } from 'react'
import { Glyph } from '../../icons/Icon.tsx'
import { FALLBACK_CATEGORY, categoryInfo } from './categories.ts'
import './CategoryBadge.css'

type Props = { categoryKey?: string; size?: number }

/** The category glyph on a soft tile tinted with the category colour. */
export default function CategoryBadge({ categoryKey, size = 36 }: Props) {
  const info = categoryInfo(categoryKey) ?? FALLBACK_CATEGORY
  const style = {
    width: size,
    height: size,
    '--badge-color': info.color,
  } as CSSProperties
  return (
    <span className="category-badge" style={style}>
      <Glyph name={info.glyph} size={Math.round(size * 0.58)} />
    </span>
  )
}
