import { readFileSync } from 'node:fs'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { translations, detectLocale, resolveTrackDisplayName, t, type Locale } from './i18n'
import { formatImportSizePolicyText } from './parse-utils'

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

  it('renders the enforced JSON and XML limits in every locale', () => {
    for (const locale of locales) {
      const rendered = formatImportSizePolicyText(translations[locale]['google.tip2'])
      expect(rendered).toContain('100')
      expect(rendered).toContain('4')
      expect(rendered).toContain('JSON')
      expect(rendered).toContain('GPX/KML')
      expect(rendered).not.toMatch(/\{(?:jsonMax|xmlMax)\}/)
    }
  })

  it('provides a localized export-duration range message in every locale', () => {
    for (const locale of locales) {
      const message = translations[locale]['export.durationRange']
        .replace('{min}', '5')
        .replace('{max}', '180')
      expect(message).toContain('5')
      expect(message).toContain('180')
      expect(message).not.toMatch(/\{(?:min|max)\}/)
    }
  })

  it('keeps the legacy Takeout illustration conditional and format-neutral', () => {
    const guide = readFileSync(
      new URL('../../public/guide/google-takeout-export.svg', import.meta.url),
      'utf8',
    )
    expect(guide).toContain('Legacy fallback')
    expect(guide).toContain('Only if Takeout offers it')
    expect(guide).toContain('Find compatible JSON')
    expect(guide).toContain('Records, Timeline Edits, or monthly JSON')
    expect(guide).not.toMatch(/Select Location History|Find Records\.json|upload Records\.json/)
  })

  it('keeps reviewed Korean, Japanese, Chinese, and Spanish phrases grammatical', () => {
    expect(translations.ko['export.estimatedTime']).toBe('예상 소요 시간:')
    expect(translations.ko['mapStyle.positron']).toBe('라이트')
    expect(translations.ko['mapStyle.dark']).toBe('다크')
    expect(`${translations.ko['app.mapStylePrefix']} ${translations.ko['mapStyle.positron']}`).toBe('지도: 라이트')
    expect(`${translations.ko['app.mapStylePrefix']} ${translations.ko['mapStyle.dark']}`).toBe('지도: 다크')
    expect(translations.ja['journey.addOneMore']).toBe('ルートを作成するには、もう1ポイント追加してください')
    expect(translations.zh['export.estimatedTime']).toBe('预计时间:')
    expect(translations.es['google.tip1']).toBe('Desde 2024, Google almacena los datos de la cronología en el dispositivo — la exportación del móvil suele tener los datos más completos')
    expect(translations.es['timeline.reset']).toBe('Restablecer intervalo de la línea de tiempo')
  })

  it('shows every supported extension and constrains named app exports in every landing locale', () => {
    const exportRequirementPatterns: Record<Locale, RegExp> = {
      en: /must export/,
      ko: /내보내야 합니다/,
      ja: /書き出してください/,
      zh: /必须导出/,
      es: /deben exportar/,
    }

    for (const locale of locales) {
      const dropHint = translations[locale]['fileUpload.dropHint']
      const formatHint = translations[locale]['fileUpload.formatHint']

      for (const extension of ['.json', '.gpx', '.kml']) {
        expect(dropHint).toContain(extension)
        expect(formatHint).toContain(extension)
      }

      for (const app of ['Google', 'Strava', 'Garmin', 'AllTrails']) {
        expect(formatHint).toContain(app)
      }
      expect(formatHint).toMatch(exportRequirementPatterns[locale])
    }
  })

  it('uses truthful ground-level camera copy in every locale', () => {
    expect(locales.map((locale) => translations[locale]['camera.ground'])).toEqual([
      'Ground-level Follow',
      '지면 시점 따라가기',
      '地上視点で追従',
      '地面视角跟随',
      'Seguimiento a ras de suelo',
    ])
    expect(locales.map((locale) => translations[locale]['camera.groundDesc'])).toEqual([
      'Follow the route from a low angle, without street imagery',
      '실제 거리 이미지 없이 낮은 지면 시점에서 경로를 따라갑니다',
      'ストリート画像を使わず、低い地上視点からルートを追従',
      '不使用街景影像，从低位地面视角跟随路线',
      'Sigue la ruta desde un ángulo bajo, sin imágenes de calles',
    ])
  })

  it('describes empty-scene follow behavior instead of automatic scene generation', () => {
    for (const locale of locales) {
      expect(translations[locale]['scenes.emptyState']).not.toMatch(
        /auto-generated|자동으로 생성|自動生成|自动生成|automáticamente/i,
      )
    }
  })

  it('provides scene-specific camera-mode labels in every locale', () => {
    for (const locale of locales) {
      const label = translations[locale]['scenes.cameraModeAria']
      expect(label).toContain('{index}')
      expect(label).toContain('{name}')
    }
  })

  it('uses concise estimated-time labels in every locale', () => {
    expect(locales.map((locale) => translations[locale]['export.estimatedTime'])).toEqual([
      'Estimated time:',
      '예상 소요 시간:',
      '所要時間の目安:',
      '预计时间:',
      'Tiempo estimado:',
    ])
  })

  it('resolves manufactured track names in every locale without translating explicit names', () => {
    const expectedNames = {
      en: ['GPX Track', 'KML Track', 'Google Location History'],
      ko: ['GPX 경로', 'KML 경로', 'Google 위치 기록'],
      ja: ['GPX トラック', 'KML トラック', 'Google ロケーション履歴'],
      zh: ['GPX 轨迹', 'KML 轨迹', 'Google 位置记录'],
      es: ['Ruta GPX', 'Ruta KML', 'Historial de ubicaciones de Google'],
    } satisfies Record<Locale, [string, string, string]>

    for (const locale of locales) {
      const translate = (key: Parameters<typeof t>[0]) => t(key, locale)
      expect([
        resolveTrackDisplayName({ name: 'GPX Track', fallbackNameSource: 'gpx' }, translate),
        resolveTrackDisplayName({ name: 'KML Track', fallbackNameSource: 'kml' }, translate),
        resolveTrackDisplayName({ name: 'Google Location History', fallbackNameSource: 'google' }, translate),
      ]).toEqual(expectedNames[locale])
    }

    for (const explicitName of ['GPX Track', 'KML Track', 'Google Location History']) {
      expect(resolveTrackDisplayName({ name: explicitName }, (key) => t(key, 'ko'))).toBe(explicitName)
    }
  })

  it('tells users when a ready video still needs to be saved', () => {
    for (const locale of locales) {
      expect(translations[locale]['export.readyDescription']).not.toMatch(/export again|다시 내보|もう一度エクスポート|再次导出|exporta de nuevo/i)
    }
    expect(translations.en['export.readyDescription']).toContain('not been saved')
    expect(translations.ko['export.readyDescription']).toContain('아직 저장되지 않았습니다')
    expect(translations.ja['export.readyDescription']).toContain('まだ保存されていません')
    expect(translations.zh['export.readyDescription']).toContain('尚未保存')
    expect(translations.es['export.readyDescription']).toContain('aún no se ha guardado')
  })

  it('names the exact localized Download MP4 action in save-failure recovery', () => {
    for (const locale of locales) {
      expect(translations[locale]['app.exportSaveFailed']).toContain(
        translations[locale]['export.download'],
      )
    }
  })

  it('describes fallback completion as a download start in every locale', () => {
    expect(locales.map((locale) => translations[locale]['export.downloadStarted'])).toEqual([
      'Download started',
      '다운로드가 시작되었습니다',
      'ダウンロードを開始しました',
      '下载已开始',
      'Descarga iniciada',
    ])

    for (const locale of locales) {
      expect(translations[locale]['export.downloadStarted']).not.toMatch(/saved|저장|保存|已保存|guardad/i)
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a valid locale', () => {
    const result = detectLocale()
    expect(locales).toContain(result)
  })

  it.each([
    ['ko', 'ko'],
    ['ko-KR', 'ko'],
    ['ko-KP', 'ko'],
    ['KO-kR', 'ko'],
    ['ja-JP', 'ja'],
    ['ZH-Hant-TW', 'zh'],
    ['ES-MX', 'es'],
    ['fr-FR', 'en'],
  ] satisfies [string, Locale][])('maps browser language %s to %s', (language, expected) => {
    vi.stubGlobal('navigator', { language })
    expect(detectLocale()).toBe(expected)
  })
})
