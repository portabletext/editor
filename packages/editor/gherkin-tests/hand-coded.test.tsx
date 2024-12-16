import type {PortableTextBlock} from '@sanity/types'
import {page, userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {createActor} from 'xstate'
import {Editors} from './editors'
import {
  createEditorContext,
  getText,
  pressButton,
  putCaretAfterText,
  putCaretBeforeText,
  type,
  undo,
} from './gherkin-step-definitions'
import {schema} from './schema'
import {testMachine} from './test-machine'

function createInitialValue(text: string): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: 'b0s0',
          marks: [],
          text,
        },
      ],
    },
  ]
}

async function setUpTest(initialValue: Array<PortableTextBlock>) {
  const testActor = createActor(testMachine, {
    input: {
      schema,
      value: initialValue,
    },
  })
  testActor.start()
  testActor.send({type: 'add editor'})

  const editorARef = testActor.getSnapshot().context.editors[0]
  const editorALocator = page.getByTestId(editorARef.id)
  const editorA = createEditorContext({
    ref: editorARef,
    locator: editorALocator,
  })

  render(<Editors testRef={testActor} />)

  await vi.waitFor(() => expect.element(editorA.locator).toBeInTheDocument())

  return {
    editorA,
    testActor,
  }
}

async function setUpCollabTest(initialValue: Array<PortableTextBlock>) {
  const testActor = createActor(testMachine, {
    input: {
      schema,
      value: initialValue,
    },
  })
  testActor.start()
  testActor.send({type: 'add editor'})
  testActor.send({type: 'add editor'})

  const editorARef = testActor.getSnapshot().context.editors[0]
  const editorALocator = page.getByTestId(editorARef.id)
  const editorA = createEditorContext({
    ref: editorARef,
    locator: editorALocator,
  })

  const editorBRef = testActor.getSnapshot().context.editors[1]
  const editorBLocator = page.getByTestId(editorBRef.id)
  const editorB = createEditorContext({
    ref: editorBRef,
    locator: editorBLocator,
  })

  render(<Editors testRef={testActor} />)

  await vi.waitFor(() => expect.element(editorA.locator).toBeInTheDocument())
  await vi.waitFor(() => expect.element(editorB.locator).toBeInTheDocument())

  return {
    editorA,
    editorB,
    testActor,
  }
}

describe('Feature: Range Decorations', () => {
  test('Scenario: Drawing a Range Decoration', async () => {
    const {editorA, testActor} = await setUpTest([
      {
        _type: 'block',
        _key: 'a',
        children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'b',
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: "It's a beautiful day on planet earth",
          },
        ],
        markDefs: [],
      },
    ])

    testActor.send({
      type: 'update range decorations',
      rangeDecorations: [
        {
          component: (props) => (
            <span data-testid="range-decoration">{props.children}</span>
          ),
          onMoved: (movedProps) => {
            const {newSelection, rangeDecoration} = movedProps
            testActor.send({
              type: 'update range decoration selection',
              selection: rangeDecoration.selection,
              newSelection,
            })
          },
          selection: {
            anchor: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 6,
            },
            focus: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 11,
            },
          },
        },
      ],
    })

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )
  })

  test('Scenario: Moving a Range Decoration', async () => {
    const {editorA, testActor} = await setUpTest([
      {
        _type: 'block',
        _key: 'a',
        children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'b',
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: "It's a beautiful day on planet earth",
          },
        ],
        markDefs: [],
      },
    ])

    testActor.send({
      type: 'update range decorations',
      rangeDecorations: [
        {
          component: (props) => (
            <span data-testid="range-decoration">{props.children}</span>
          ),
          onMoved: (movedProps) => {
            const {newSelection, rangeDecoration} = movedProps
            testActor.send({
              type: 'update range decoration selection',
              selection: rangeDecoration.selection,
              newSelection,
            })
          },
          selection: {
            anchor: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 6,
            },
            focus: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 11,
            },
          },
        },
      ],
    })

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )

    await putCaretBeforeText(editorA, 'Hello')

    await type(editorA, '123 ')

    await getText().then((text) =>
      expect(text).toEqual([
        '123 Hello there world',
        '|',
        "It's a beautiful day on planet earth",
      ]),
    )

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )
  })

  test('Scenario: Drawing a collapsed Range Decoration', async () => {
    const {editorA, testActor} = await setUpTest([
      {
        _type: 'block',
        _key: 'a',
        children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'b',
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: "It's a beautiful day on planet earth",
          },
        ],
        markDefs: [],
      },
    ])

    testActor.send({
      type: 'update range decorations',
      rangeDecorations: [
        {
          component: (props) => (
            <span data-testid="range-decoration">{props.children}</span>
          ),
          onMoved: (movedProps) => {
            const {newSelection, rangeDecoration} = movedProps
            testActor.send({
              type: 'update range decoration selection',
              selection: rangeDecoration.selection,
              newSelection,
            })
          },
          selection: {
            anchor: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 6,
            },
            focus: {
              path: [{_key: 'a'}, 'children', {_key: 'a1'}],
              offset: 6,
            },
          },
        },
      ],
    })

    await vi.waitFor(() =>
      expect
        .element(editorA.locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )
  })
})

describe('Undo/Redo Collaboration (hand-coded)', () => {
  test('will let editor A undo their change after B did an unrelated change (multi-line block)', async () => {
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue('First paragraph\n\nSecond paragraph!'),
    )

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, '!')
    await type(editorA, '?')

    await getText().then((text) =>
      expect(text).toEqual(['First paragraph\n\nSecond paragraph!?']),
    )

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, 'First')
    await type(editorB, 'Welcome')

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, 'First')
    await pressButton(editorB, 'Shift+Enter', 2)

    await getText().then((text) =>
      expect(text).toEqual([
        'Welcome\n\nFirst paragraph\n\nSecond paragraph!?',
      ]),
    )

    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual(['Welcome\n\nFirst paragraph\n\nSecond paragraph!']),
    )
  })

  test('undoing in reverse order as applied', async () => {
    const firstParagraph =
      '速ヒマヤレ誌相ルなあね日諸せ変評ホ真攻同潔ク作先た員勝どそ際接レゅ自17浅ッ実情スヤ籍認ス重力務鳥の。8平はートご多乗12青國暮整ル通国うれけこ能新ロコラハ元横ミ休探ミソ梓批ざょにね薬展むい本隣ば禁抗ワアミ部真えくト提知週むすほ。査ル人形ルおじつ政謙減セヲモ読見れレぞえ録精てざ定第ぐゆとス務接産ヤ写馬エモス聞氏サヘマ有午ごね客岡ヘロ修彩枝雨父のけリド。'
    const secondParagraph =
      '住ゅなぜ日16語約セヤチ任政崎ソオユ枠体ぞン古91一専泉給12関モリレネ解透ぴゃラぼ転地す球北ドざう記番重投ぼづ。期ゃ更緒リだすし夫内オ代他られくド潤刊本クヘフ伊一ウムニヘ感週け出入ば勇起ょ関図ぜ覧説めわぶ室訪おがト強車傾町コ本喰杜椿榎ほれた。暮る生的更芸窓どさはむ近問ラ入必ラニス療心コウ怒応りめけひ載総ア北吾ヌイヘ主最ニ余記エツヤ州5念稼め化浮ヌリ済毎養ぜぼ。'
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue(`${firstParagraph}\n\n${secondParagraph}`),
    )

    await userEvent.click(editorA.locator)
    await putCaretBeforeText(editorA, '速')
    await type(editorA, 'Paragraph 1: ')

    await getText().then((text) =>
      expect(text).toEqual([
        `Paragraph 1: ${firstParagraph}\n\n${secondParagraph}`,
      ]),
    )

    await userEvent.click(editorB.locator)
    await putCaretAfterText(editorB, 'ド。')
    await type(editorB, ' (end of paragraph 1)')

    await getText().then((text) =>
      expect(text).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}`,
      ]),
    )

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, 'ぼ。')
    await type(editorA, '. EOL.')

    await getText().then((text) =>
      expect(text).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}. EOL.`,
      ]),
    )

    // Spaces in the text creates more undo steps
    await undo(editorA)
    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}`,
      ]),
    )

    await undo(editorB)
    await undo(editorB)
    await undo(editorB)
    await undo(editorB)

    await getText().then((text) =>
      expect(text).toEqual([
        `Paragraph 1: ${firstParagraph}\n\n${secondParagraph}`,
      ]),
    )

    await undo(editorA)
    await undo(editorA)
    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([`${firstParagraph}\n\n${secondParagraph}`]),
    )
  })

  test('undoing out-of-order', async () => {
    const firstParagraph =
      '速ヒマヤレ誌相ルなあね日諸せ変評ホ真攻同潔ク作先た員勝どそ際接レゅ自17浅ッ実情スヤ籍認ス重力務鳥の。8平はートご多乗12青國暮整ル通国うれけこ能新ロコラハ元横ミ休探ミソ梓批ざょにね薬展むい本隣ば禁抗ワアミ部真えくト提知週むすほ。査ル人形ルおじつ政謙減セヲモ読見れレぞえ録精てざ定第ぐゆとス務接産ヤ写馬エモス聞氏サヘマ有午ごね客岡ヘロ修彩枝雨父のけリド。'
    const secondParagraph =
      '住ゅなぜ日16語約セヤチ任政崎ソオユ枠体ぞン古91一専泉給12関モリレネ解透ぴゃラぼ転地す球北ドざう記番重投ぼづ。期ゃ更緒リだすし夫内オ代他られくド潤刊本クヘフ伊一ウムニヘ感週け出入ば勇起ょ関図ぜ覧説めわぶ室訪おがト強車傾町コ本喰杜椿榎ほれた。暮る生的更芸窓どさはむ近問ラ入必ラニス療心コウ怒応りめけひ載総ア北吾ヌイヘ主最ニ余記エツヤ州5念稼め化浮ヌリ済毎養ぜぼ。'
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue(`${firstParagraph}\n\n${secondParagraph}`),
    )

    await userEvent.click(editorA.locator)
    await putCaretBeforeText(editorA, '速')
    await type(editorA, 'Paragraph 1: ')

    await userEvent.click(editorB.locator)
    await putCaretAfterText(editorB, 'ド。')
    await type(editorB, ' (end of paragraph 1)')

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, 'ぼ。')
    await type(editorA, '. EOL.')

    await undo(editorA)
    await undo(editorA)

    await undo(editorA)
    await undo(editorA)
    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([
        `${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}`,
      ]),
    )

    await undo(editorB)
    await undo(editorB)
    await undo(editorB)
    await undo(editorB)

    await getText().then((text) =>
      expect(text).toEqual([`${firstParagraph}\n\n${secondParagraph}`]),
    )
  })

  test('editor A undo their change after B did an unrelated change (single-line, emoji)', async () => {
    const [beginning, middle, end] = [
      'A curious 🦊 named Felix lived in the 🪄🌲 of Willowwood. One day, he discovered a mysterious 🕳️, which lead to a magical 🌌. ',
      'In the Saturn of Celestia, Fox met a friendly Unicorn named Sparkle. ',
      'They had extraordinary adventures together, befriending a 🧚, who gave them so many 📚 that they never lacked for reading material!',
    ]
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue(`${beginning}${end}`),
    )

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, '!')
    await pressButton(editorA, 'Backspace', 1)

    await userEvent.click(editorB.locator)
    await putCaretAfterText(editorB, '🌌. ')
    await type(editorB, middle)

    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([`${beginning}${middle}${end}`]),
    )
  })

  test('editor A undo their change after B did an unrelated change (multi-line block, emoji)', async () => {
    const initialText = `In the 🪐 of Celestia, 🦊 met a friendly 🌈🦄 named Sparkle.\n\nThey had extraordinary adventures together, befriending a 🧚, who gave them so many 📚 that they never lacked for reading material!`
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue(initialText),
    )

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, '!')
    await pressButton(editorA, 'Backspace', 1)

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, 'In')
    const newPrefix = 'New prefix.'
    await type(editorB, newPrefix)

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, 'In')
    await pressButton(editorB, 'Shift+Enter', 2)

    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([`${newPrefix}\n\n${initialText}`]),
    )
  })

  test('editor A undo their change after B did an unrelated change (multi-line block, kanji)', async () => {
    const initialText = `彼は、偉大な番兵がまさに尾根の頂上にいて、裸足では地面から最も低い枝にあることを知っていた。 彼は腹ばいになって雪と泥の中に滑り込み、下の何もない空き地を見下ろした。\n\n彼の心臓は胸の中で止まった。 しばらくの間、彼は息をすることさえできなかった。 月明かりは空き地、キャンプファイヤーの灰、雪に覆われた斜面、大きな岩、半分凍った小さな小川を照らしていました。すべては数1時間前とまったく同じでした。`
    const {editorA, editorB} = await setUpCollabTest(
      createInitialValue(initialText),
    )

    await userEvent.click(editorA.locator)
    await putCaretAfterText(editorA, '1')
    await pressButton(editorA, 'Backspace', 1)

    const newPrefix = 'new prefix'

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, '彼は、')
    await type(editorB, newPrefix)

    await userEvent.click(editorB.locator)
    await putCaretBeforeText(editorB, '彼は、')
    await pressButton(editorB, 'Shift+Enter', 2)

    await undo(editorA)

    await getText().then((text) =>
      expect(text).toEqual([`${newPrefix}\n\n${initialText}`]),
    )
  })
})
