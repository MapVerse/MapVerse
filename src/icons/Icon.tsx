import { GLYPHS, type GlyphName } from './glyphs.ts'
import { STROKES, type StrokeName } from './strokes.ts'

type IconProps = { name: StrokeName; size?: number; strokeWidth?: number }

/** Line icon that takes the current text colour. */
export function Icon({ name, size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={STROKES[name]} />
    </svg>
  )
}

type GlyphProps = { name: GlyphName; size?: number }

/** Two-tone filled glyph that takes the current text colour. */
export function Glyph({ name, size = 20 }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      {GLYPHS[name].map((layer, i) => (
        <path
          key={i}
          d={layer.d}
          fillRule={'evenodd' in layer ? 'evenodd' : undefined}
          opacity={'light' in layer ? 0.4 : undefined}
          {...('soften' in layer && {
            stroke: 'currentColor',
            strokeWidth: 1.4,
            strokeLinejoin: 'round',
          })}
        />
      ))}
    </svg>
  )
}
