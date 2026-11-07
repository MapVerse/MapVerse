import type { tr } from './tr.ts'

/** A message, or its forms by number where the language has them. */
export type Message = string | { one: string; other: string }

/** The messages there are, as the Turkish dictionary names them. */
export type MessageKey = keyof typeof tr

/** Every message in one language: none may be missing, none extra. */
export type Dictionary = { readonly [K in MessageKey]: Message }
