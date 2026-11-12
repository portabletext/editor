import {readFileSync} from 'node:fs'
import {expect, test} from 'vitest'
import {packageNodes} from './hierarchy.ts'
import {LAYOUTS} from './symbols.ts'

test('recorded held keys supply every popup character in the layout table', () => {
  const labels: Record<string, string> = {
    'underline': '_',
    'Middle dot': '·',
    '中点': '・',
    '下線': '_',
  }
  for (const [keyboard, layout, fixture, label, popupY] of [
    ['en', 'symbols', 'en-symbols-dash-held.xml', 'Dash', 1701],
    ['ja', 'richSymbols', 'ja-rich-symbols-dash-held.xml', 'ダッシュ', 1555],
  ] as const) {
    const nodes = packageNodes(
      readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'),
      'com.google.android.inputmethod.latin',
    )
    expect(
      nodes
        .filter((node) => node.center[1] === popupY)
        .map((node) => labels[node.label] ?? node.label),
    ).toEqual(LAYOUTS[keyboard][layout]!.keys['-']!.popup)
    expect(LAYOUTS[keyboard][layout]!.keys['-']!.label).toEqual(label)
  }
})
