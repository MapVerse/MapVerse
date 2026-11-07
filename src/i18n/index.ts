import { en } from './en.ts'
import { currentLocale, intlLocale, type Locale } from './locale.ts'
import { tr } from './tr.ts'
import type { Dictionary, MessageKey } from './types.ts'

export {
  currentLocale,
  intlLocale,
  setLocalePreference,
  subscribeLocale,
  systemLocale,
  useLocale,
  useLocalePreference,
  type Locale,
  type LocalePreference,
} from './locale.ts'
export type { MessageKey } from './types.ts'

/** Values put into a message's {placeholders}; `count` also picks a plural. */
export type Params = Record<string, string | number>

export const DICTIONARIES: Record<Locale, Dictionary> = { tr, en }

const plurals = new Map<string, Intl.PluralRules>()

function pluralOf(locale: Locale, count: number) {
  const tag = intlLocale(locale)
  let rules = plurals.get(tag)
  if (!rules) {
    rules = new Intl.PluralRules(tag)
    plurals.set(tag, rules)
  }
  return rules.select(count)
}

/** A message in a given language, its {placeholders} filled in. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Params,
): string {
  const message = DICTIONARIES[locale][key]
  const text =
    typeof message === 'string'
      ? message
      : pluralOf(locale, Number(params?.count ?? 0)) === 'one'
        ? message.one
        : message.other
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : whole,
  )
}

/** A message in the language in use. */
export const t = (key: MessageKey, params?: Params) =>
  translate(currentLocale(), key, params)
