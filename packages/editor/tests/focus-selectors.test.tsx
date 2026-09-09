import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getFocusBlock, getFocusChild} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

describe('the focus block', () => {
  test('Scenario: clicking into a text block returns it as the focus block', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(getFocusBlock(editor.getSnapshot())?.node).toEqual({
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      })
    })
  })

  test('Scenario: clicking a block object returns it as the focus block', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'img1',
        },
      ],
    })

    const imageElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="img1"]\']')

    expect(imageElement).not.toBeNull()
    await userEvent.click(imageElement!)

    await vi.waitFor(() => {
      expect(getFocusBlock(editor.getSnapshot())?.node).toEqual({
        _type: 'image',
        _key: 'img1',
      })
    })
  })

  test('Scenario: no selection means no focus block', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getFocusBlock(editor.getSnapshot())?.node).toBeUndefined()
    })
  })
})

describe('the focus child', () => {
  test('Scenario: clicking into a span returns it as the focus child', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(getFocusChild(editor.getSnapshot())?.node).toEqual({
        _type: 'span',
        _key: 's1',
        text: 'foo',
        marks: [],
      })
    })
  })

  test('Scenario: clicking an inline object returns it as the focus child', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'before '},
            {_type: 'stock-ticker', _key: 'st1'},
            {_type: 'span', _key: 's2', text: ' after'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const stockTickerElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="b1"].children[_key=="st1"]\']')

    expect(stockTickerElement).not.toBeNull()
    await userEvent.click(stockTickerElement!)

    await vi.waitFor(() => {
      expect(getFocusChild(editor.getSnapshot())?.node).toEqual({
        _type: 'stock-ticker',
        _key: 'st1',
      })
    })
  })

  test('Scenario: clicking a block object returns no focus child', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'img1',
        },
      ],
    })

    const imageElement = locator
      .element()
      .querySelector('[data-pt-path=\'[_key=="img1"]\']')

    expect(imageElement).not.toBeNull()
    await userEvent.click(imageElement!)

    await vi.waitFor(() => {
      expect(getFocusChild(editor.getSnapshot())?.node).toBeUndefined()
    })
  })

  test('Scenario: no selection means no focus child', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getFocusChild(editor.getSnapshot())?.node).toBeUndefined()
    })
  })
})
