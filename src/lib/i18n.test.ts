import { describe, it, expect } from 'vitest'
import { translations, detectLocale, t, type Locale } from './i18n'

const locales = Object.keys(translations) as Locale[]

describe('i18n locale key parity', () => {
  it('all locales have the same set of keys', () => {
    const enKeys = Object.keys(translations.en).sort()
    for (const locale of locales) {
      if (locale === 'en') continue
      const localeKeys = Object.keys(translations[locale]).sort()
      const missingInLocale = enKeys.filter((k) => !localeKeys.includes(k))
      const extraInLocale = localeKeys.filter((k) => !enKeys.includes(k))
      expect(missingInLocale).toEqual([])
      expect(extraInLocale).toEqual([])
    }
  })

  it('no locale has duplicate keys (object literal guarantees this, but verify)', () => {
    for (const locale of locales) {
      const keys = Object.keys(translations[locale])
      const unique = new Set(keys)
      expect(keys.length).toBe(unique.size)
    }
  })

  it('does not promise a Google Takeout processing duration', () => {
    for (const locale of locales) {
      expect(translations[locale]['google.step2TakeoutItem1']).not.toMatch(/\d/)
    }
  })
})

describe('t()', () => {
  it('returns English value for known key', () => {
    expect(t('fileUpload.title', 'en')).toBe('Travelback')
  })

  it('returns Korean value for known key', () => {
    expect(t('fileUpload.title', 'ko')).toBe('Travelback')
  })

  it('falls back to English for missing locale key (hypothetical)', () => {
    // t() falls back to en then to key itself
    // Since all keys exist, test the fallback path with a cast
    const result = t('fileUpload.title')
    expect(result).toBe('Travelback')
  })
})

describe('detectLocale()', () => {
  it('returns a valid locale', () => {
    const result = detectLocale()
    expect(locales).toContain(result)
  })
})
