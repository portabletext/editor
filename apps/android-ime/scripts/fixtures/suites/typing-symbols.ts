import {readFileSync} from 'node:fs'
import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: Typing "- " on English switches to the symbol layout and presses Enter there', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['']})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    picked: ['space'],
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
  })
})

test('Scenario: Typing "- " on Japanese QWERTY goes from romaji past the alphabet layout and the numeric pad to its symbols for a dash key, and back to romaji after Enter', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['']})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    picked: ['space'],
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'スペース',
        'Enter',
        'かな入力キーボード',
      ],
    ],
  })
})

test('Scenario: A letter after a symbol waits for the letter layout again', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['A-b ']})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'a-b'}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    text: 'A-b ',
    taps: [['A', 'Symbol keyboard', 'Dash', 'Letter keyboard', 'B', 'Space']],
  })
})

test('Scenario: Dumps of the old layout and of a half-drawn symbol layout are dumped again', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: [''],
    staleDumpsPerSwitch: 2,
    partialDumps: 2,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    picked: ['space'],
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
  })
})

test('Scenario: A rejected tap on a symbol key is a driver fault and is typed again', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', ''], rejectFirst: 'Dash'})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [{letters: '- ', enter: true}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    picked: ['space'],
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard'],
    ],
  })
})

test('Scenario: A symbol no layout shows is a driver fault on both attempts naming each layout dump, never another key', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', ''], noDash: true})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "no Gboard key labelled 'Dash' or '-' on any of 2 layouts, see out/en-a-symbol-no-layout-shows-is-a-driver-fault-on-both-attempts-naming-each-layout-dump-never-another-key-retry-layout-0.xml, out/en-a-symbol-no-layout-shows-is-a-driver-fault-on-both-attempts-naming-each-layout-dump-never-another-key-retry-layout-1.xml",
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Letter keyboard'],
    ],
    run: 'faulted',
  })
})

test('Scenario: No ダッシュ cell on the rich symbol panel 記号キーボード opens is a driver fault before any input naming its labels and its dump, and Gboard is back on romaji for the retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['', ''], noDash: true})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "no Gboard key labelled 'Dash' or '-' or 'ダッシュ' on the layout '記号キーボード' opens, its labels ['文字キーボード', '削除', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '感嘆符', '@', '#', '$', '%', 'サーカムフレックス アクセント', '&', '*', '左かっこ', '右かっこ', 'アポストロフィ', '引用符', '等号', '下線', 'グレイヴ', 'コロン', 'セミコロン', '疑問符', 'チルダ', '縦線', 'プラス', 'バックスラッシュ', 'スラッシュ', '左角かっこ', '右角かっこ', '左中かっこ', '右中かっこ', '小なり記号', '大なり記号', '左二重引用符', '右二重引用符', '中点', '左引用符', '右引用符', '倒立感嘆符', '倒立疑問符', '円記号', '€', '£', 'セント記号', '©', '®', '™', '℃', '華氏', '°', '節記号', '数記号', 'ダガー', 'ダブルダガー', '2 点リーダー', '省略記号', 'パーミル記号'], see out/ja-no-cell-on-the-rich-symbol-panel-opens-is-a-driver-fault-before-any-input-naming-its-labels-and-its-dump-and-gboard-is-back-on-romaji-for-the-retry-retry-layout-3.xml",
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        '文字キーボード',
        'かな入力キーボード',
      ],
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        '文字キーボード',
        'かな入力キーボード',
      ],
    ],
    run: 'faulted',
  })
})

test('Scenario: The emoji and media panel opened by 記号キーボード is a driver fault before any input naming its labels and saving its dump, with no cell or category tapped', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['', ''], symbolsOpenEmoji: true})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    dump: readFileSync(
      'out/ja-the-emoji-and-media-panel-opened-by-is-a-driver-fault-before-any-input-naming-its-labels-and-saving-its-dump-with-no-cell-or-category-tapped-retry-layout-3.xml',
      'utf8',
    ),
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "Gboard showed no whole new layout in 8 dumps, its labels ['文字キーボード', '削除'], see out/ja-the-emoji-and-media-panel-opened-by-is-a-driver-fault-before-any-input-naming-its-labels-and-saving-its-dump-with-no-cell-or-category-tapped-retry-layout-3.xml",
    dump: readFileSync(new URL('../ja-emoji.xml', import.meta.url), 'utf8'),
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        '文字キーボード',
        '数字キーボード',
        'かな入力キーボード',
      ],
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        '文字キーボード',
        '数字キーボード',
        'かな入力キーボード',
      ],
    ],
    run: 'faulted',
  })
})

test('Scenario: Half-drawn dumps of the Japanese numeric pad are dumped again, and the dash is typed past it', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: [''], partialPadDumps: 2})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  })
  await vi.runAllTimersAsync()

  expect({
    picked: (await typing).picked,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    picked: ['space'],
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'スペース',
        'かな入力キーボード',
      ],
    ],
  })
})

test('Scenario: Half-drawn dumps of the Japanese numeric pad that never complete are a driver fault before 記号キーボード is tapped, and Gboard is back on romaji for the retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['', ''], partialPadDumps: 99})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      'Gboard showed no whole new layout in 8 dumps, see out/ja-half-drawn-dumps-of-the-japanese-numeric-pad-that-never-complete-are-a-driver-fault-before-is-tapped-and-gboard-is-back-on-romaji-for-the-retry-retry-layout-2.xml',
    taps: [
      ['アルファベット入力キーボード', '数字キーボード', 'かな入力キーボード'],
      ['アルファベット入力キーボード', '数字キーボード', 'かな入力キーボード'],
    ],
    run: 'faulted',
  })
})

test('Scenario: The Japanese alphabet layout with its emoji key as the only other switch is a driver fault with the emoji key never tapped, and with no way back the retry finds no Japanese', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['', ''], noDigitsKey: true})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error: 'could not switch Gboard to Japanese',
    taps: [['アルファベット入力キーボード'], []],
    run: 'faulted',
  })
})

test('Scenario: A digit typed on the symbol layout is no mistap, ASCII or full width', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['１-']})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '1- '}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    text: '１-',
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '1',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'スペース',
        'かな入力キーボード',
      ],
    ],
  })
})

test('Scenario: A digit the letters do not hold after a symbol is still a mistap', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['-7', '- ']})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    text: '- ',
    taps: [
      ['Symbol keyboard', 'Dash', 'Space', 'Letter keyboard'],
      ['Symbol keyboard', 'Dash', 'Space', 'Letter keyboard'],
    ],
  })
})

test('Scenario: A letter after a dash on the Japanese symbol layout waits for romaji', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'ja', texts: ['-b']})
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '-b'}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
  }).toEqual({
    text: '-b',
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'かな入力キーボード',
        'b',
        'スペース',
      ],
    ],
  })
})

test('Scenario: Half-drawn dumps of the symbol layout that never complete are a driver fault, with nothing typed on them and Gboard taken back to its letters', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', ''], partialDumps: 99})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      'Gboard showed no whole new layout in 8 dumps, see out/en-half-drawn-dumps-of-the-symbol-layout-that-never-complete-are-a-driver-fault-with-nothing-typed-on-them-and-gboard-taken-back-to-its-letters-retry-layout-1.xml',
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Letter keyboard'],
    ],
    run: 'faulted',
  })
})

test('Scenario: Dumps that keep showing the old layout after a switch are a driver fault, with nothing typed on them and Gboard taken back to its letters', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', ''], staleDumpsPerSwitch: 8})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      'Gboard showed no whole new layout in 8 dumps, see out/en-dumps-that-keep-showing-the-old-layout-after-a-switch-are-a-driver-fault-with-nothing-typed-on-them-and-gboard-taken-back-to-its-letters-retry-layout-1.xml',
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Letter keyboard'],
    ],
    run: 'faulted',
  })
})

test('Scenario: Dumps of the symbol layout with only its Space, Enter, Delete and Dash keys are a driver fault, with nothing typed on them and Gboard taken back to its letters', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', texts: ['', ''], controlsOnlyDumps: 99})
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      'Gboard showed no whole new layout in 8 dumps, see out/en-dumps-of-the-symbol-layout-with-only-its-space-enter-delete-and-dash-keys-are-a-driver-fault-with-nothing-typed-on-them-and-gboard-taken-back-to-its-letters-retry-layout-1.xml',
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Letter keyboard'],
    ],
    run: 'faulted',
  })
})

test('Scenario: Dumps that keep showing the old keys under a changing suggestion after a switch are a driver fault, with nothing typed on them and Gboard taken back to its letters', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    texts: ['', ''],
    staleDumpsPerSwitch: 8,
    staleSuggestion: true,
  })
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: '- '}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      'Gboard showed no whole new layout in 8 dumps, see out/en-dumps-that-keep-showing-the-old-keys-under-a-changing-suggestion-after-a-switch-are-a-driver-fault-with-nothing-typed-on-them-and-gboard-taken-back-to-its-letters-retry-layout-1.xml',
    taps: [
      ['Symbol keyboard', 'Letter keyboard'],
      ['Symbol keyboard', 'Letter keyboard'],
    ],
    run: 'faulted',
  })
})

const REMOVE_CHILD = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const DASH_SPACE = {
  at: {
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
  },
}

test('Scenario: On the recorded rich symbol panel 記号キーボード opens, "- " is typed with its ダッシュ cell and Space on the pad, and Enter is pressed after the dash precondition', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'ja',
    page: (taps) =>
      taps.includes('Enter')
        ? {text: '', deletions: [DASH_SPACE]}
        : {text: taps.includes('スペース') ? '- ' : ''},
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [
      {
        letters: '- ',
        enter: true,
        expect: {
          trigger: 'commit',
          text: '- ',
          deletedOnCommit: '- ',
          textOnCommit: '',
          blocksOnCommit: 1,
        },
      },
    ],
    crash: REMOVE_CHILD,
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    typed: {
      text: '',
      picked: ['space'],
      compositionstart: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [],
      blocks: 1,
      beforeCommit: [{text: '- ', blocks: 1}],
      decoratedPerWord: [[]],
    },
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'スペース',
        'Enter',
        'かな入力キーボード',
      ],
    ],
    run: 'complete',
  })
})

test('Scenario: A ダッシュ cell that commits U+2014 ends the crash case inconclusive before Enter, naming the code point', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'ja',
    page: (taps) => ({text: taps.includes('スペース') ? '— ' : ''}),
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [
      {
        letters: '- ',
        enter: true,
        expect: {
          trigger: 'commit',
          text: '- ',
          deletedOnCommit: '- ',
          textOnCommit: '',
          blocksOnCommit: 1,
        },
      },
    ],
    crash: REMOVE_CHILD,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    error:
      "InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault: Error: word 1 did not reach the case's mechanism: the block read '— ', not '- ', code points U+2014 U+0020 for U+002D U+0020, and input the attempt sent may still reach the page, so a read without errors after it is no result",
    taps: [
      [
        'アルファベット入力キーボード',
        '数字キーボード',
        '記号キーボード',
        'ダッシュ',
        '文字キーボード',
        'スペース',
        'かな入力キーボード',
      ],
    ],
    run: 'inconclusive',
  })
})
