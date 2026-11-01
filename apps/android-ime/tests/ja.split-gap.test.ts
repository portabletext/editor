import {expect, test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// The editor with the spike's composition hold (`hold=1`) on a page whose `bar` block, above the block Gboard
// composes in, gets a new decoration on each change of the value while a composition is open (`gap=bar`). The
// editor renders each of those changes during the composition as a `Text`-only commit away from the composing
// text, which crashed off-device with `removeChild`'s `NotFoundError` without the restore boundary, with the
// hold and on main alike. The second case adds the boundary. `committedRanges` holds the `bar` ranges the page
// handed the editor while composing, so each case shows the other block's decoration changed. Word 1 may be
// committed as kana by Space, as Gboard does on a fresh field when it offers no 今日 yet.

test("Scenario: Typing kyou twice while another block's decoration changes during each composition with the composition hold", async () => {
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?gap=bar&hold=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  expect({
    errors: typed.errors,
    text: typed.text,
    gapRangesWhileComposing: [
      ...new Set(
        typed.committedRanges!.flatMap((ranges) =>
          ranges.filter((range) => range.composing).map((range) => range.text),
        ),
      ),
    ].sort(),
  }).toEqual({
    errors: [],
    text: `bar\n${typed.picked.map((picked) => (picked === 'space' ? 'きょう　' : picked)).join('')}`,
    gapRangesWhileComposing: ['b', 'ba', 'bar'],
  })
})

test("Scenario: Typing kyou twice while another block's decoration changes during each composition with the composition hold and the restore boundary", async () => {
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?gap=bar&hold=1&boundary=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  expect({
    errors: typed.errors,
    text: typed.text,
    gapRangesWhileComposing: [
      ...new Set(
        typed.committedRanges!.flatMap((ranges) =>
          ranges.filter((range) => range.composing).map((range) => range.text),
        ),
      ),
    ].sort(),
  }).toEqual({
    errors: [],
    text: `bar\n${typed.picked.map((picked) => (picked === 'space' ? 'きょう　' : picked)).join('')}`,
    gapRangesWhileComposing: ['b', 'ba', 'bar'],
  })
})
