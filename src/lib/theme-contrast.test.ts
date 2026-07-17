import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../styles/vitro-base.css', import.meta.url), 'utf8')

function ruleBody(selector: string) {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing CSS rule: ${selector}`)
  const bodyStart = css.indexOf('{', start) + 1
  const bodyEnd = css.indexOf('}', bodyStart)
  return css.slice(bodyStart, bodyEnd)
}

function tokenValue(rule: string, token: string) {
  const match = rule.match(new RegExp(`${token}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!match) throw new Error(`Missing ${token}`)
  return match[1]
}

function relativeLuminance(hex: string) {
  const channels = hex.match(/[0-9A-Fa-f]{2}/g)?.map(channel => Number.parseInt(channel, 16) / 255)
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`)
  const linear = channels.map(channel => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('semantic text contrast tokens', () => {
  it.each([
    { selector: ':root', backgrounds: ['#FFFFFF', '#EBEEF4', '#E5EAF3'] },
    { selector: '[data-mode=dark]', backgrounds: ['#0A0D14', '#101420', '#1E2332'] },
  ])('$selector warning and error foregrounds meet normal-text contrast', ({ selector, backgrounds }) => {
    const rule = ruleBody(selector)
    for (const token of ['--warn-fg', '--err-fg']) {
      const foreground = tokenValue(rule, token)
      for (const background of backgrounds) {
        expect(contrastRatio(foreground, background), `${token} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
