import {mkdirSync, readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {packageKeys} from './hierarchy.ts'
import {
  checkWords,
  compositionstartPerWord,
  ensureJapanese,
  isJapanese,
  isWholeOtherLayout,
  MIN_PANEL_ROWS,
  MIN_ROW_KEYS,
  PAD_KEYS,
  keyboardState,
  layoutKeys,
  layoutSwitchKey,
  nestedCompositionstart,
  OUT,
  pageUrl,
  shellQuote,
  symbolKeys,
  symbolLabels,
  unexpectedDigit,
  unmetEvidence,
  type Word,
} from './typing.ts'

describe(nestedCompositionstart.name, () => {
  test('the Japanese empty-block run restarted the composition once', () => {
    expect(nestedCompositionstart(fixtureEvents('ja-editor-empty.json'))).toEqual(1)
  })

  test('the English run composes nothing', () => {
    expect(nestedCompositionstart(fixtureEvents('en-plain-empty.json'))).toEqual(0)
  })
})

describe(compositionstartPerWord.name, () => {
  test('the Japanese empty-block run started two compositions in the first word and one in the second', () => {
    expect(compositionstartPerWord(fixtureEvents('ja-editor-empty.json'), [17, 38])).toEqual([2, 1])
  })

  test('the Japanese run after existing text started one composition per word', () => {
    expect(compositionstartPerWord(fixtureEvents('ja-editor-prefix.json'), [17, 34])).toEqual([1, 1])
  })
})

describe(checkWords.name, () => {
  test('a required candidate after letters that end in a space is a configuration error', () => {
    expect(() =>
      checkWords([
        {letters: 'kyou', candidate: '今日', required: true},
        {letters: 'kyou ', candidate: '今日', required: true},
      ]),
    ).toThrow(
      new Error("word 2 requires candidate '今日', but its letters end in a space, which commits it first"),
    )
  })

  test('a required candidate on a word that only taps Enter is a configuration error', () => {
    expect(() => checkWords([{letters: '', enter: true, candidate: '今日', required: true}])).toThrow(
      new Error("word 1 requires candidate '今日', but has no letters"),
    )
  })

  test('a symbol whose label no recorded dump shows is a configuration error', () => {
    expect(() => checkWords([{letters: 'a%'}])).toThrow(new Error("word 1 has '%', whose Gboard label no recorded dump shows"))
  })

  test('a word of no letters without Enter is a configuration error', () => {
    expect(() => checkWords([{letters: ''}])).toThrow(new Error('word 1 has no letters and no enter'))
  })

  test('a case with a crash and a word without expect, or without exactly one trigger, is a configuration error', () => {
    const crash = /removeChild/
    expect([
      () => checkWords([{letters: 'kyou', expect: {trigger: 'letters'}}, {letters: 'kyou'}], crash),
      () => checkWords([{letters: 'kyou', expect: {}}, {letters: 'kyou', expect: {}}], crash),
      () => checkWords([{letters: 'kyou', expect: {trigger: 'letters'}}, {letters: 'kyou', expect: {trigger: 'letters'}}], crash),
    ].map((check) => {
      try {
        return check()
      } catch (error) {
        return (error as Error).message
      }
    })).toEqual([
      'a case with a `crash` gives every word an `expect`',
      'a case with a `crash` names exactly one `trigger`, not 0',
      'a case with a `crash` names exactly one `trigger`, not 2',
    ])
  })

  test('a case with a crash and one trigger, and a case without a crash and no expect, are typed', () => {
    expect([
      checkWords([{letters: 'kyou', expect: {}}, {letters: 'kyou', expect: {trigger: 'letters'}}], /removeChild/),
      checkWords([{letters: 'kyou'}, {letters: 'kyou'}]),
    ]).toEqual([undefined, undefined])
  })

  test('a required candidate after letters, an optional one after a space and Enter alone are typed', () => {
    expect(
      checkWords([
        {letters: 'kyou', candidate: '今日', required: true},
        {letters: 'kyou ', candidate: '今日'},
        {letters: '', enter: true},
        {letters: '- ', enter: true},
      ]),
    ).toEqual(undefined)
  })
})

describe(unmetEvidence.name, () => {
  const ERROR = "NotFoundError: Failed to execute 'removeChild' on 'Node'"
  const NONE = {decorated: 0, committed: 0, deletions: 0}
  const kyou: Word = {
    letters: 'kyou',
    candidate: '今日',
    required: true,
    expect: {
      trigger: 'commit',
      composing: true,
      committed: 'きょう',
      decorated: 'きょう',
      droppedOnCommit: 'きょう',
      removedOnCommit: true,
    },
  }
  const composing = {
    text: 'きょう',
    events: [{type: 'compositionstart'}],
    errors: [],
    committed: [[], [{text: 'きょう', composing: true}]],
    decorated: [{text: 'きょう', composing: true, live: 'きょう'}],
  }
  const beforeTap = {start: NONE, beforeCommit: {decorated: 1, committed: 2, deletions: 0}}

  test('a composing kana range committed and mounted once the letters are tapped, and dropped and unmounted on the commit, are the evidence', () => {
    expect([
      unmetEvidence(kyou, 'letters', composing, {start: NONE, beforeCommit: NONE}),
      unmetEvidence(
        kyou,
        'commit',
        {
          text: '今日',
          events: [{type: 'compositionstart'}, {type: 'compositionend'}],
          errors: [],
          committed: [...composing.committed, []],
          decorated: [{text: 'きょう', composing: true, live: null}],
        },
        beforeTap,
      ),
    ]).toEqual([undefined, undefined])
  })

  test('no open composition, a range or decoration from an earlier word or one outside the composition is no evidence', () => {
    expect([
      unmetEvidence(kyou, 'letters', {...composing, events: [{type: 'compositionstart'}, {type: 'compositionend'}]}, {start: NONE, beforeCommit: NONE}),
      unmetEvidence(kyou, 'letters', composing, {start: {decorated: 1, committed: 2, deletions: 0}, beforeCommit: NONE}),
      unmetEvidence(kyou, 'letters', {...composing, committed: [[], [{text: 'きょう', composing: false}]]}, {start: NONE, beforeCommit: NONE}),
      unmetEvidence(
        kyou,
        'letters',
        {...composing, decorated: [{text: 'きょう', composing: false, live: 'きょう'}]},
        {start: NONE, beforeCommit: NONE},
      ),
    ]).toEqual([
      'no composition was open',
      "no commit added a decoration range over 'きょう' inside the composition",
      "no commit added a decoration range over 'きょう' inside the composition",
      "no decoration over 'きょう' mounted inside the composition",
    ])
  })

  test('a kana range still committed after the tap, no commit after it, a kana decoration kept or one wrapping the candidate is no removal', () => {
    const converted = {...composing, text: '今日', events: [{type: 'compositionstart'}, {type: 'compositionend'}]}
    expect([
      unmetEvidence(kyou, 'commit', {...converted, committed: [...composing.committed, [{text: 'きょう', composing: false}]]}, beforeTap),
      unmetEvidence(kyou, 'commit', converted, beforeTap),
      unmetEvidence(
        kyou,
        'commit',
        {...converted, committed: [...composing.committed, []], decorated: [{text: 'きょう', composing: true, live: '今日'}]},
        beforeTap,
      ),
      unmetEvidence(
        kyou,
        'commit',
        {
          ...converted,
          committed: [...composing.committed, []],
          decorated: [
            {text: 'きょう', composing: true, live: null},
            {text: '今日', composing: false, live: '今日'},
          ],
        },
        beforeTap,
      ),
    ]).toEqual([
      "the last commit after the commit's tap still handed the editor a range over 'きょう'",
      "no commit handed the editor decoration ranges after the commit's tap",
      "a decoration over 'きょう' was still mounted after the commit",
      "a decoration over 'きょう' was still mounted after the commit",
    ])
  })

  test('a kana decoration of an earlier word committed as kana may stay mounted while its range stays committed, but no more of them', () => {
    const earlier = {start: {decorated: 1, committed: 2, deletions: 0}, beforeCommit: {decorated: 2, committed: 3, deletions: 0}}
    const kept: {text: string; composing: boolean; live: string | null} = {text: 'きょう', composing: true, live: 'きょう'}
    const state = (decorated: Array<typeof kept>) => ({
      text: 'きょう今日',
      events: [{type: 'compositionstart'}, {type: 'compositionend'}, {type: 'compositionstart'}, {type: 'compositionend'}],
      errors: [],
      committed: [[], [{text: 'きょう', composing: false}], [{text: 'きょう', composing: true}, {text: 'きょう', composing: true}], [{text: 'きょう', composing: false}]],
      decorated,
    })
    expect([
      unmetEvidence(kyou, 'commit', state([kept, {...kept, live: null}]), earlier),
      unmetEvidence(kyou, 'commit', state([kept, kept]), earlier),
    ]).toEqual([undefined, "a decoration over 'きょう' was still mounted after the commit"])
  })

  test('an error on the trigger counts with the last commit after the tap dropping the kana range, without a mount or an unmount', () => {
    expect(
      unmetEvidence(
        kyou,
        'commit',
        {text: null, events: [], errors: [ERROR], committed: [...composing.committed, []], decorated: composing.decorated},
        beforeTap,
      ),
    ).toEqual(undefined)
  })

  test('an error on the trigger without a commit after the tap, or with the kana range in the last one before the error, is no evidence', () => {
    expect([
      unmetEvidence(kyou, 'commit', {text: null, events: [], errors: [ERROR], committed: composing.committed, decorated: []}, beforeTap),
      unmetEvidence(
        kyou,
        'commit',
        {
          text: null,
          events: [],
          errors: [ERROR],
          committed: [...composing.committed, [{text: 'きょう', composing: false}]],
          decorated: [],
        },
        beforeTap,
      ),
      unmetEvidence(
        kyou,
        'commit',
        {
          text: null,
          events: [],
          errors: [ERROR],
          committed: [...composing.committed, [], [{text: 'きょう', composing: false}]],
          decorated: [],
        },
        beforeTap,
      ),
    ]).toEqual([
      "no commit handed the editor decoration ranges after the commit's tap",
      "the last commit after the commit's tap still handed the editor a range over 'きょう'",
      "the last commit after the commit's tap still handed the editor a range over 'きょう'",
    ])
  })

  test('an error at a step other than the trigger is no evidence, on a word with a trigger or without one', () => {
    const { trigger: _trigger, ...earlier } = kyou.expect!
    expect([
      unmetEvidence(kyou, 'letters', {...composing, errors: [ERROR]}, {start: NONE, beforeCommit: NONE}),
      unmetEvidence({...kyou, expect: earlier}, 'commit', {...composing, errors: [ERROR]}, beforeTap),
      unmetEvidence({...kyou, expect: earlier}, 'letters', {...composing, errors: [ERROR]}, {start: NONE, beforeCommit: NONE}),
    ]).toEqual([
      `the page recorded errors at the letters, which is not the case's trigger: ["${ERROR}"]`,
      `the page recorded errors at the commit, which is not the case's trigger: ["${ERROR}"]`,
      `the page recorded errors at the letters, which is not the case's trigger: ["${ERROR}"]`,
    ])
  })

  test('a converted word needs one more range over it in the last commit after the tap than before it', () => {
    const kanji: Word = {
      letters: 'kyou',
      candidate: '今日',
      required: true,
      expect: {trigger: 'commit', composing: true, committedOnCommit: '今日', decoratedOnCommit: '今日'},
    }
    const second = {start: {decorated: 1, committed: 3, deletions: 0}, beforeCommit: {decorated: 1, committed: 4, deletions: 0}}
    const firstWord = [[], [], [{text: '今日', composing: false}]]
    const typing = [...firstWord, [{text: '今日', composing: true}]]
    const two = [{text: '今日', composing: false}, {text: '今日', composing: false}]
    expect([
      unmetEvidence(kanji, 'commit', {text: null, events: [], errors: [ERROR], committed: [...typing, two]}, second),
      unmetEvidence(kanji, 'commit', {text: null, events: [], errors: [ERROR], committed: [...typing, [{text: '今日', composing: false}]]}, second),
      unmetEvidence(kanji, 'commit', {text: null, events: [], errors: [ERROR], committed: typing}, second),
      unmetEvidence(kanji, 'commit', {text: null, events: [], errors: [ERROR], committed: [...typing, two, [{text: '今日', composing: false}]]}, second),
    ]).toEqual([
      undefined,
      "the last commit after the commit's tap added no decoration range over '今日'",
      "no commit handed the editor decoration ranges after the commit's tap",
      "the last commit after the commit's tap added no decoration range over '今日'",
    ])
  })

  test('an Enter word needs the dash before Enter and a delete.text over it after, and without an error the deletion', () => {
    const enter: Word = {
      letters: '',
      enter: true,
      expect: {trigger: 'commit', text: '- ', deletedOnCommit: '- ', textOnCommit: '', blocksOnCommit: 1},
    }
    const path = [{_key: 'k0'}, 'children', {_key: 'k1'}]
    const dash = {at: {anchor: {path, offset: 0}, focus: {path, offset: 2}}}
    const marks = {start: NONE, beforeCommit: NONE}
    expect([
      unmetEvidence(enter, 'letters', {text: '- ', events: [], errors: []}, marks),
      unmetEvidence(enter, 'letters', {text: ' ', events: [], errors: []}, marks),
      unmetEvidence(enter, 'commit', {text: '', blocks: 1, events: [], errors: [], deletions: [dash]}, marks),
      unmetEvidence(enter, 'commit', {text: '', blocks: 1, events: [], errors: [], deletions: []}, marks),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [ERROR], deletions: []}, marks),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [ERROR], deletions: [dash]}, marks),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [ERROR], deletions: [{at: {anchor: {path, offset: 0}, focus: {path, offset: 1}}}]}, marks),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [ERROR], deletions: [{at: {anchor: {path, offset: 2}, focus: {path, offset: 0}}}]}, marks),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [ERROR], deletions: [dash]}, {start: NONE, beforeCommit: {decorated: 0, committed: 0, deletions: 1}}),
      unmetEvidence(enter, 'commit', {text: '- \n', blocks: 2, events: [], errors: [], deletions: [dash]}, marks),
      unmetEvidence(enter, 'commit', {text: '', blocks: 2, events: [], errors: [], deletions: [dash]}, marks),
    ]).toEqual([
      undefined,
      "the block read ' ', not '- '",
      undefined,
      "the editor performed no delete.text over '- ' after the commit's tap",
      "the editor performed no delete.text over '- ' after the commit's tap",
      undefined,
      "the editor performed no delete.text over '- ' after the commit's tap",
      undefined,
      "the editor performed no delete.text over '- ' after the commit's tap",
      "the block read '- \\n' after the commit, not ''",
      'the page held 2 blocks after the commit, not 1',
    ])
  })

  test('a dash other than U+002D before Enter names its code point, whichever dash Gboard committed', () => {
    const enter: Word = {letters: '- ', enter: true, expect: {trigger: 'commit', text: '- '}}
    const marks = {start: NONE, beforeCommit: NONE}

    expect(['\u2014', '\u2015', '\u30fc', '\uff0d'].map((dash) => unmetEvidence(enter, 'letters', {text: `${dash} `, events: [], errors: []}, marks))).toEqual([
      "the block read '\u2014 ', not '- ', code points U+2014 U+0020 for U+002D U+0020",
      "the block read '\u2015 ', not '- ', code points U+2015 U+0020 for U+002D U+0020",
      "the block read '\u30fc ', not '- ', code points U+30FC U+0020 for U+002D U+0020",
      "the block read '\uff0d ', not '- ', code points U+FF0D U+0020 for U+002D U+0020",
    ])
  })
})

describe(pageUrl.name, () => {
  test('a page without query parameters gets only the prefix', () => {
    expect(pageUrl('editor.html', 'x')).toEqual('http://localhost:8765/editor.html?prefix=x')
  })

  test('an empty prefix is kept as an empty parameter', () => {
    expect(pageUrl('plain.html', '')).toEqual('http://localhost:8765/plain.html?prefix=')
  })

  test('the prefix follows the page parameters, encoded the way Chrome reports the URL', () => {
    expect(pageUrl('editor.html?decorate=今日', '- ')).toEqual('http://localhost:8765/editor.html?decorate=%E4%BB%8A%E6%97%A5&prefix=-+')
  })
})

describe(shellQuote.name, () => {
  test('a URL with several query parameters is one word', () => {
    expect(shellQuote('http://localhost:8765/editor.html?behavior=dissolve-on-break&prefix=-+')).toEqual(
      "'http://localhost:8765/editor.html?behavior=dissolve-on-break&prefix=-+'",
    )
  })

  test('a single quote closes the word, is escaped and reopens it', () => {
    expect(shellQuote("it's")).toEqual("'it'\\''s'")
  })
})

describe(unexpectedDigit.name, () => {
  test('a digit the inputs do not hold is found, ASCII or full width', () => {
    expect([
      unexpectedDigit('K7ou kyou ', 'kyoukyou'),
      unexpectedDigit('ｋ７', 'kyou'),
      unexpectedDigit('x7kyou ', 'x7kyou'),
      unexpectedDigit('今日今日', 'kyoukyou'),
      unexpectedDigit(null, 'kyou'),
    ]).toEqual(['7', '７', undefined, undefined, undefined])
  })

  test('a prefix of a dash and a space holds no digit, and a stray digit after it is still found', () => {
    expect([unexpectedDigit('- ', '- '), unexpectedDigit('', '- '), unexpectedDigit('- 7', '- ')]).toEqual([undefined, undefined, '7'])
  })
})

describe(layoutSwitchKey.name, () => {
  test('is the layout key of each recorded layout, back_to_prime and switch_hiragana_alphabet included, never an emoji key', () => {
    expect(['en-keyboard.xml', 'en-symbols.xml', 'ja-keyboard.xml', 'ja-alphabet.xml', 'ja-emoji.xml', 'ja-numbers.xml'].map((fixture) => layoutSwitchKey(fixtureXml(fixture)))).toEqual([
      {id: 'key_pos_switch_to_symbol', label: 'Symbol keyboard', center: [85, 2196]},
      {id: 'key_pos_back_to_prime', label: 'Letter keyboard', center: [85, 2196]},
      {id: 'key_pos_switch_to_symbol', label: 'アルファベット入力キーボード', center: [85, 2196]},
      {id: 'key_pos_switch_hiragana_alphabet', label: '数字キーボード', center: [85, 2196]},
      {id: 'key_pos_back_to_prime', label: '文字キーボード', center: [75, 2205]},
      {id: 'key_pos_switch_hiragana_alphabet', label: 'かな入力キーボード', center: [112, 2196]},
    ])
  })

  test('the Japanese alphabet layout without 数字キーボード has none, since its other switch is the emoji key', () => {
    expect(layoutSwitchKey(fixtureXml('ja-alphabet.xml').replace('id/key_pos_switch_hiragana_alphabet"', 'id/unknown"'))).toEqual(undefined)
  })

  test('a dump without Gboard has none', () => {
    expect(layoutSwitchKey(fixtureXml('no-gboard.xml'))).toEqual(undefined)
  })
})

describe(symbolLabels.name, () => {
  test('are the labels of the recorded English symbol layout, `-` also as itself, and none for a symbol no dump shows', () => {
    expect([symbolLabels('-'), symbolLabels('?'), symbolLabels('1'), symbolLabels('%'), symbolLabels('ー')]).toEqual([
      ['Dash', '-'],
      ['Question mark'],
      ['1'],
      undefined,
      undefined,
    ])
  })

  test('on Japanese also include ダッシュ for `-`, a cell of the recorded rich symbol panel, and nothing more for any other symbol', () => {
    expect([symbolLabels('-', 'ja'), symbolLabels('-', 'en'), symbolLabels('?', 'ja'), symbolLabels('%', 'ja')]).toEqual([
      ['Dash', '-', 'ダッシュ'],
      ['Dash', '-'],
      ['Question mark'],
      undefined,
    ])
  })

  test('each is a key of the recorded English symbol layout', () => {
    const keys = layoutKeys(fixtureXml('en-symbols.xml'))

    expect([...'0123456789@#$&*",.-_+()/\':;!?'].filter((symbol) => !symbolLabels(symbol)!.some((label) => keys.has(label)))).toEqual([])
  })
})

describe(symbolKeys.name, () => {
  test('holds no cell, category key or toolbar button of the emoji and media panel, only its way back and Delete', () => {
    const keys = symbolKeys(fixtureXml('ja-emoji.xml'))

    expect({labels: [...keys.keys()].sort(), wayBack: keys.get('文字キーボード')}).toEqual({labels: ['削除', '文字キーボード'].sort(), wayBack: [75, 2205]})
  })

  test('on the recorded rich symbol panel hold its way back, Delete and its cells, ダッシュ at its center, and no category key or heading control', () => {
    const keys = symbolKeys(fixtureXml('ja-rich-symbols.xml'))

    expect({
      size: keys.size,
      first: [...keys.keys()].slice(0, 4),
      dash: keys.get('ダッシュ'),
      others: ['リッチ記号キーボード', '絵文字キーボード', 'GIF キーボード', 'リッチ記号キーボード を非表示にする', '記号', 'Back'].filter((label) => keys.has(label)),
    }).toEqual({size: 66, first: ['文字キーボード', '削除', '1', '2'], dash: [1012, 1721], others: []})
  })

  test('on the emoji and media panel with リッチ記号キーボード selected still hold no cell', () => {
    const emojiPanel = fixtureXml('ja-emoji.xml')
      .replace(/(content-desc="絵文字キーボード"[^>]*?)selected="true"/, '$1selected="false"')
      .replace(/(content-desc="リッチ記号キーボード"[^>]*?)selected="false"/, '$1selected="true"')

    expect([...symbolKeys(emojiPanel).keys()]).toEqual(['文字キーボード', '削除'])
  })

  test('on the recorded Japanese numeric pad are its keys, the hint texts under them not', () => {
    expect([...symbolKeys(fixtureXml('ja-numbers.xml')).keys()].filter((label) => !/キーボード|操作|^[左右]$|^(削除|スペース|Enter)$|^(機能|音声)/.test(label))).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '(', '0', '.',
    ])
  })
})

describe(layoutKeys.name, () => {
  test('holds the keys of the English letters but not the number hints on them', () => {
    const keys = layoutKeys(fixtureXml('en-keyboard.xml'))

    expect({q: keys.get('Q'), digits: [...'0123456789'].filter((digit) => keys.has(digit))}).toEqual({q: [58, 1731], digits: []})
  })
})

describe(isWholeOtherLayout.name, () => {
  const gboardKey = (id: string, label: string, index: number) =>
    `<node resource-id="com.google.android.inputmethod.latin:id/${id}" package="com.google.android.inputmethod.latin" content-desc="${label}" bounds="[${index * 100},2100][${index * 100 + 100},2200]" />`
  const layout = (...keys: Array<[string, string]>) =>
    `<hierarchy>${keys.map(([id, label], index) => gboardKey(id, label, index)).join('')}</hierarchy>`
  const controls: Array<[string, string]> = [
    ['key_pos_switch_to_symbol', 'ABC'],
    ['key_pos_space', 'Space'],
    ['key_pos_ime_action', 'Enter'],
    ['key_pos_del', 'Delete'],
  ]
  const row = (labels: string): Array<[string, string]> => [...labels].map((label, column) => [`key_pos_1_${column}`, label])

  test('the recorded English symbol layout and Japanese numeric pad are whole, and the emoji and media panel is not', () => {
    expect([isWholeOtherLayout(fixtureXml('en-symbols.xml')), isWholeOtherLayout(fixtureXml('ja-numbers.xml')), isWholeOtherLayout(fixtureXml('ja-emoji.xml'))]).toEqual([true, true, false])
  })

  test('the recorded Japanese numeric pad is not whole with any one of its twelve keys, かな入力キーボード, 記号キーボード, Space, Enter or Delete unlabelled', () => {
    const unlabelled = (id: string) =>
      fixtureXml('ja-numbers.xml').replace(new RegExp(`(id/${id}"[^>]*content-desc=")[^"]*"`), '$1"')
    const ids = [
      ...Array.from({length: PAD_KEYS}, (_, index) => `key_pos_ja_12keys_${index + 1}`),
      'key_pos_switch_hiragana_alphabet',
      'key_pos_switch_to_symbol',
      'key_pos_space',
      'key_pos_ime_action',
      'key_pos_del',
    ]

    expect(ids.filter((id) => isWholeOtherLayout(unlabelled(id)))).toEqual([])
  })

  const emojiPanel = fixtureXml('ja-emoji.xml')
  const selecting = (xml: string, category: string, selected: boolean) =>
    xml.replace(new RegExp(`(content-desc="${category}"[^>]*?)selected="[^"]*"`), `$1selected="${selected}"`)

  test('the emoji and media panel is not whole unchanged, with no category selected, with リッチ記号キーボード selected or with the selected category unlabelled', () => {
    const unselected = selecting(emojiPanel, '絵文字キーボード', false)

    expect([
      isWholeOtherLayout(emojiPanel),
      isWholeOtherLayout(unselected),
      isWholeOtherLayout(selecting(unselected, 'リッチ記号キーボード', true)),
      isWholeOtherLayout(emojiPanel.replace('content-desc="絵文字キーボード" ', 'content-desc="" ')),
    ]).toEqual([false, false, false, false])
  })

  const richPanel = fixtureXml('ja-rich-symbols.xml')
  /** The rich symbol panel with every cell whose bounds match `cell` unlabelled. */
  const withoutCells = (cell: RegExp) =>
    richPanel.replace(/<node [^>]*?resource-id="" [^>]*?>/g, (node) => (cell.test(/bounds="([^"]*)"/.exec(node)![1]!) ? node.replace(/content-desc="[^"]*"/, 'content-desc=""') : node))

  test('the recorded rich symbol panel is whole, identified by its one selected category リッチ記号キーボード', () => {
    expect(isWholeOtherLayout(richPanel)).toEqual(true)
  })

  test('the rich symbol panel is not whole with リッチ記号キーボード deselected, unlabelled, an emoji category selected instead, also selected, or its heading naming another category', () => {
    expect([
      isWholeOtherLayout(selecting(richPanel, 'リッチ記号キーボード', false)),
      isWholeOtherLayout(richPanel.replace('content-desc="リッチ記号キーボード" ', 'content-desc="" ')),
      isWholeOtherLayout(selecting(selecting(richPanel, 'リッチ記号キーボード', false), '絵文字キーボード', true)),
      isWholeOtherLayout(selecting(richPanel, '絵文字キーボード', true)),
      isWholeOtherLayout(richPanel.replace('content-desc="リッチ記号キーボード を非表示にする"', 'content-desc="絵文字キーボード を非表示にする"')),
    ]).toEqual([false, false, false, false, false])
  })

  test(`the rich symbol panel is not whole with its cells cut to fewer than ${MIN_PANEL_ROWS} rows, or to rows of fewer than ${MIN_ROW_KEYS}, or without 文字キーボード or 削除`, () => {
    expect([
      isWholeOtherLayout(withoutCells(/^\[\d+,(?!1308\]|1426\])\d+\]/)),
      isWholeOtherLayout(withoutCells(/^\[(823|958),/)),
      isWholeOtherLayout(richPanel.replace('content-desc="文字キーボード"', 'content-desc=""')),
      isWholeOtherLayout(richPanel.replace('content-desc="削除"', 'content-desc=""')),
    ]).toEqual([false, false, false, false])
  })

  test('a layout of its layout key, Space, Enter, Delete and a row of seven keys is whole, on English and Japanese', () => {
    expect([
      isWholeOtherLayout(layout(...controls, ...row('@#$_&-+'))),
      isWholeOtherLayout(layout(['key_pos_switch_to_symbol', '記号'], ['key_pos_space', 'スペース'], ['key_pos_ime_action', 'Enter'], ['key_pos_del', '削除'], ...row('@#$_&-+'))),
    ]).toEqual([true, true])
  })

  test('only the controls and a dash, a row of six keys, or any one control missing is not whole', () => {
    expect([
      isWholeOtherLayout(layout(['key_pos_1_0', '-'], ...controls.slice(1))),
      isWholeOtherLayout(layout(...controls, ['key_pos_1_0', '-'])),
      isWholeOtherLayout(layout(...controls, ...row('@#$_&-'))),
      ...controls.map((_, missing) => isWholeOtherLayout(layout(...controls.filter((__, index) => index !== missing), ...row('@#$_&-+')))),
    ]).toEqual([false, false, false, false, false, false, false])
  })

  test('content keys spread over rows of fewer than seven do not make a row', () => {
    expect(
      isWholeOtherLayout(layout(...controls, ...[...'@#$_&-'].map((label, column): [string, string] => [`key_pos_0_${column}`, label]), ...[...'+()'].map((label, column): [string, string] => [`key_pos_2_${column}`, label]))),
    ).toEqual(false)
  })
})

describe(isJapanese.name, () => {
  test('only the Japanese QWERTY dump reads as Japanese', () => {
    expect(
      ['en-keyboard.xml', 'ja-banner.xml', 'ja-next-language.xml', 'ja-keyboard.xml'].map((fixture) =>
        isJapanese(packageKeys(readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'), 'com.google.android.inputmethod.latin').keys()),
      ),
    ).toEqual([false, false, false, true])
  })
})

describe(ensureJapanese.name, () => {
  test('runs beforeSwitch immediately before the tap on the language key, not before the banner is closed', async () => {
    const screens = ['ja-banner.xml', 'ja-next-language.xml', 'ja-keyboard.xml']
    const actions: string[] = []
    const device = {
      dumpHierarchy: async () => {
        actions.push(`dump ${screens[0]}`)
        return fixtureXml(screens[0]!)
      },
      click: async (x: number, y: number) => {
        const label = [...fixtureKeys(screens[0]!)].find(([, center]) => center[0] === x && center[1] === y)?.[0]
        actions.push(`tap ${label}`)
        screens.shift()
      },
    }

    mkdirSync(OUT, {recursive: true})
    await ensureJapanese(device as never, 'ensure-japanese', async () => {
      actions.push('before switch')
    })

    expect(actions).toEqual([
      'dump ja-banner.xml',
      'dump ja-banner.xml',
      'tap Close the new language installation banner.',
      'dump ja-next-language.xml',
      'dump ja-next-language.xml',
      'dump ja-next-language.xml',
      'before switch',
      'tap Next language',
      'dump ja-keyboard.xml',
      'dump ja-keyboard.xml',
    ])
  })
})

describe(keyboardState.name, () => {
  test('the recorded dumps read as the English layout, the banner, the English layout and Japanese QWERTY', () => {
    expect(['en-keyboard.xml', 'ja-banner.xml', 'ja-next-language.xml', 'ja-keyboard.xml', 'no-gboard.xml'].map((fixture) => keyboardState(fixtureKeys(fixture)))).toEqual([
      'other',
      'banner',
      'other',
      'japanese-qwerty',
      'partial',
    ])
  })

  test('a Japanese dump taken mid-redraw, with its space key and hints but without every letter, is partial', () => {
    const keys = fixtureKeys('ja-keyboard.xml')
    keys.delete('k')

    expect(keyboardState(keys)).toEqual('partial')
  })

  test('an English dump that lost a toolbar label is still the English layout, not a switch', () => {
    const keys = fixtureKeys('en-keyboard.xml')
    keys.delete('Clipboard')

    expect(keyboardState(keys)).toEqual('other')
  })
})

function fixtureKeys(fixture: string): Map<string, [number, number]> {
  return packageKeys(readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8'), 'com.google.android.inputmethod.latin')
}

function fixtureXml(fixture: string): string {
  return readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8')
}

function fixtureEvents(fixture: string): Array<{type: string}> {
  return JSON.parse(readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), 'utf8')).state.events
}
