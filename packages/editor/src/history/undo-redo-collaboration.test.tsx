import {getTersePt} from '@portabletext/test'
import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../internal-utils/text-selection'
import {createTestEditors} from '../test/vitest'

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

describe('Undo/Redo Collaboration (hand-coded)', () => {
  test('will let editor A undo their change after B did an unrelated change (multi-line block)', async () => {
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      initialValue: createInitialValue('First paragraph\n\nSecond paragraph!'),
    })

    await userEvent.click(locator)

    const selection = getSelectionAfterText(editor.getSnapshot().context, '!')

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.type(locator, '?')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'First paragraph\n\nSecond paragraph!?',
      ])
    })

    await userEvent.click(locatorB)

    const selectionB = getSelectionBeforeText(
      editorB.getSnapshot().context,
      'First',
    )

    editorB.send({
      type: 'select',
      at: selectionB,
    })

    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })

    await userEvent.type(locatorB, 'Welcome')

    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'Welcome\n\nFirst paragraph\n\nSecond paragraph!',
      ])
    })
  })

  // Flaky
  test.skip('undoing in reverse order as applied', async () => {
    const firstParagraph =
      '速ヒマヤレ誌相ルなあね日諸せ変評ホ真攻同潔ク作先た員勝どそ際接レゅ自17浅ッ実情スヤ籍認ス重力務鳥の。8平はートご多乗12青國暮整ル通国うれけこ能新ロコラハ元横ミ休探ミソ梓批ざょにね薬展むい本隣ば禁抗ワアミ部真えくト提知週むすほ。査ル人形ルおじつ政謙減セヲモ読見れレぞえ録精てざ定第ぐゆとス務接産ヤ写馬エモス聞氏サヘマ有午ごね客岡ヘロ修彩枝雨父のけリド。'
    const secondParagraph =
      '住ゅなぜ日16語約セヤチ任政崎ソオユ枠体ぞン古91一専泉給12関モリレネ解透ぴゃラぼ転地す球北ドざう記番重投ぼづ。期ゃ更緒リだすし夫内オ代他られくド潤刊本クヘフ伊一ウムニヘ感週け出入ば勇起ょ関図ぜ覧説めわぶ室訪おがト強車傾町コ本喰杜椿榎ほれた。暮る生的更芸窓どさはむ近問ラ入必ラニス療心コウ怒応りめけひ載総ア北吾ヌイヘ主最ニ余記エツヤ州5念稼め化浮ヌリ済毎養ぜぼ。'
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      initialValue: createInitialValue(
        `${firstParagraph}\n\n${secondParagraph}`,
      ),
    })

    await userEvent.click(locator)

    const selection = getSelectionBeforeText(editor.getSnapshot().context, '速')
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.type(locator, 'Paragraph 1: ')

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `Paragraph 1: ${firstParagraph}\n\n${secondParagraph}`,
      ])
    })

    await userEvent.click(locatorB)

    const selectionB = getSelectionAfterText(
      editorB.getSnapshot().context,
      'ド。',
    )
    editorB.send({
      type: 'select',
      at: selectionB,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })

    await userEvent.type(locatorB, ' (end of paragraph 1)')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}`,
      ])
    })

    await userEvent.click(locator)

    const selectionC = getSelectionAfterText(
      editor.getSnapshot().context,
      'ぼ。',
    )
    editor.send({
      type: 'select',
      at: selectionC,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selectionC)
    })

    await userEvent.type(locator, '. EOL.')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}. EOL.`,
      ])
    })

    // Spaces in the text creates more undo steps
    editor.send({
      type: 'history.undo',
    })
    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `Paragraph 1: ${firstParagraph} (end of paragraph 1)\n\n${secondParagraph}`,
      ])
    })

    editorB.send({
      type: 'history.undo',
    })
    editorB.send({
      type: 'history.undo',
    })
    editorB.send({
      type: 'history.undo',
    })
    editorB.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `Paragraph 1: ${firstParagraph}\n\n${secondParagraph}`,
      ])
    })

    editor.send({
      type: 'history.undo',
    })
    editor.send({
      type: 'history.undo',
    })
    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${firstParagraph}\n\n${secondParagraph}`,
      ])
    })
  })

  test('undoing out-of-order', async () => {
    const firstParagraph = '速ド。'
    const secondParagraph = '住ぼ。'
    const {editor, editorB, locator, locatorB} = await createTestEditors({
      initialValue: createInitialValue(
        `${firstParagraph}\n\n${secondParagraph}`,
      ),
    })

    await userEvent.click(locator)
    const selection = getSelectionBeforeText(editor.getSnapshot().context, '速')
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.type(locator, 'P1>')

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `P1>${firstParagraph}\n\n${secondParagraph}`,
      ])
    })

    await userEvent.click(locatorB)
    const selectionB = getSelectionAfterText(
      editorB.getSnapshot().context,
      'ド。',
    )
    editorB.send({
      type: 'select',
      at: selectionB,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })

    await userEvent.type(locatorB, '/P1')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `P1>${firstParagraph}/P1\n\n${secondParagraph}`,
      ])
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `P1>${firstParagraph}/P1\n\n${secondParagraph}`,
      ])
    })

    await userEvent.click(locator)

    const selectionC = getSelectionAfterText(
      editor.getSnapshot().context,
      'ぼ。',
    )
    editor.send({
      type: 'select',
      at: selectionC,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selectionC)
    })

    await userEvent.type(locator, '/P2')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `P1>${firstParagraph}/P1\n\n${secondParagraph}/P2`,
      ])
    })

    editor.send({
      type: 'history.undo',
    })
    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `${firstParagraph}/P1\n\n${secondParagraph}`,
      ])
    })

    editorB.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${firstParagraph}\n\n${secondParagraph}`,
      ])
    })
  })

  test('editor A undo their change after B did an unrelated change (single-line, emoji)', async () => {
    const [beginning, middle, end] = [
      'A curious 🦊 named Felix lived in the 🪄🌲 of Willowwood. One day, he discovered a mysterious 🕳️, which lead to a magical 🌌. ',
      'In the Saturn of Celestia, Fox met a friendly Unicorn named Sparkle. ',
      'They had extraordinary adventures together, befriending a 🧚, who gave them so many 📚 that they never lacked for reading material!',
    ]
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      initialValue: createInitialValue(`${beginning}${end}`),
    })

    await userEvent.click(locator)

    const selection = getSelectionAfterText(editor.getSnapshot().context, '!')
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `${beginning}${end.slice(0, -1)}`,
      ])
    })

    await userEvent.click(locatorB)

    const selectionB = getSelectionAfterText(
      editorB.getSnapshot().context,
      '🌌. ',
    )
    editorB.send({
      type: 'select',
      at: selectionB,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })

    await userEvent.type(locatorB, middle)

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${beginning}${middle}${end.slice(0, -1)}`,
      ])
    })

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${beginning}${middle}${end}`,
      ])
    })
  })

  test('editor A undo their change after B did an unrelated change (multi-line block, emoji)', async () => {
    const initialText = `In the 🪐 of Celestia, 🦊 met a friendly 🌈🦄 named Sparkle.\n\nThey had extraordinary adventures together, befriending a 🧚, who gave them so many 📚 that they never lacked for reading material!`
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      initialValue: createInitialValue(initialText),
    })

    await userEvent.click(locator)
    const selection = getSelectionAfterText(editor.getSnapshot().context, '!')
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `${initialText.slice(0, -1)}`,
      ])
    })

    await userEvent.click(locatorB)

    const selectionB = getSelectionBeforeText(
      editorB.getSnapshot().context,
      'In',
    )
    editorB.send({
      type: 'select',
      at: selectionB,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })
    const newPrefix = 'New prefix.'
    await userEvent.type(locatorB, newPrefix)

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${newPrefix}${initialText.slice(0, -1)}`,
      ])
    })

    await userEvent.click(locatorB)

    const selectionC = getSelectionAfterText(
      editorB.getSnapshot().context,
      newPrefix,
    )
    editorB.send({
      type: 'select',
      at: selectionC,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionC)
    })

    editorB.send({
      type: 'insert.soft break',
    })
    editorB.send({
      type: 'insert.soft break',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${newPrefix}\n\n${initialText.slice(0, -1)}`,
      ])
    })

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${newPrefix}\n\n${initialText}`,
      ])
    })
  })

  test('editor A undo their change after B did an unrelated change (multi-line block, kanji)', async () => {
    const initialText = `彼は、偉大な番兵がまさに尾根の頂上にいて、裸足では地面から最も低い枝にあることを知っていた。 彼は腹ばいになって雪と泥の中に滑り込み、下の何もない空き地を見下ろした。\n\n彼の心臓は胸の中で止まった。 しばらくの間、彼は息をすることさえできなかった。 月明かりは空き地、キャンプファイヤーの灰、雪に覆われた斜面、大きな岩、半分凍った小さな小川を照らしていました。すべては数1時間前とまったく同じでした。`
    const {editor, locator, editorB, locatorB} = await createTestEditors({
      initialValue: createInitialValue(initialText),
    })

    await userEvent.click(locator)
    const selection = getSelectionAfterText(
      editor.getSnapshot().context,
      'じでした。',
    )
    editor.send({
      type: 'select',
      at: selection,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${initialText.slice(0, -1)}`,
      ])
    })

    const newPrefix = 'new prefix'

    await userEvent.click(locatorB)
    const selectionB = getSelectionBeforeText(
      editorB.getSnapshot().context,
      '彼は、',
    )
    editorB.send({
      type: 'select',
      at: selectionB,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
    })

    await userEvent.type(locatorB, newPrefix)

    await vi.waitFor(() => {
      expect(getTersePt(editorB.getSnapshot().context)).toEqual([
        `${newPrefix}${initialText.slice(0, -1)}`,
      ])
    })

    const selectionC = getSelectionAfterText(
      editorB.getSnapshot().context,
      newPrefix,
    )
    editorB.send({
      type: 'select',
      at: selectionC,
    })
    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.selection).toEqual(selectionC)
    })

    editorB.send({
      type: 'insert.soft break',
    })
    editorB.send({
      type: 'insert.soft break',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${newPrefix}\n\n${initialText.slice(0, -1)}`,
      ])
    })

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        `${newPrefix}\n\n${initialText}`,
      ])
    })
  })
})
