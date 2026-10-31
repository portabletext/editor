import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {packageKeys, parseXml} from './hierarchy.ts'
import {pyRepr, pySorted} from './util.ts'

describe(packageKeys.name, () => {
  test('the English keyboard dump has its keys and the space key', () => {
    const keys = gboardKeys('en-keyboard.xml')

    expect(keys.size).toEqual(52)
    expect(keys.has('Space')).toEqual(true)
    expect(keys.get('K')).toEqual([860, 1885])
    // The PHASE line a recorded CI run printed for this dump.
    expect(pyRepr(pySorted(keys.keys()).slice(0, 40))).toEqual(
      "[',', '.', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'Back', 'C', 'Clipboard', 'D', 'Delete', 'E', 'Emoji button', 'Enter', 'F', 'G', 'GIF Keyboard', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'Open features menu', 'P', 'Q', 'R', 'S', 'Settings', 'Shift enabled']",
    )
  })

  test('the Gboard v15 install banner is found before the language key', () => {
    const keys = gboardKeys('ja-banner.xml')

    expect(
      [...keys.keys()].filter((label) =>
        label.toLowerCase().startsWith('close the new language'),
      ),
    ).toEqual(['Close the new language installation banner.'])
  })

  test('the English layout offers Next language once the banner is closed', () => {
    const keys = gboardKeys('ja-next-language.xml')

    expect(
      [...keys.keys()].filter((label) =>
        /^(next language|switch to|globe)/i.test(label),
      ),
    ).toEqual(['Next language'])
  })

  test('the Japanese QWERTY layout has a k key and labels its space key スペース', () => {
    const keys = gboardKeys('ja-keyboard.xml')

    expect([keys.has('k'), keys.has('スペース')]).toEqual([true, true])
  })

  test('a dump without Gboard nodes has no keys', () => {
    expect(gboardKeys('no-gboard.xml').size).toEqual(0)
  })
})

describe(parseXml.name, () => {
  test('malformed XML throws', () => {
    expect(() => parseXml('<hierarchy><node></hierarchy>')).toThrow()
    expect(() =>
      parseXml('<hierarchy><node a="&nope;"/></hierarchy>'),
    ).toThrow()
    expect(() => parseXml('')).toThrow()
  })
})

function gboardKeys(fixture: string): Map<string, [number, number]> {
  return packageKeys(
    readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'),
    'com.google.android.inputmethod.latin',
  )
}
