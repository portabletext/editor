import {defineSchema, type PortableTextTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {EditorEmittedEvent} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'
import {isKeyedSegment} from '../src/utils'

describe('event.insert.inline object', () => {
  test('Scenario: Inserting inline object without any initial fields', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'stock ticker',
            fields: [{type: 'string', name: 'symbol'}],
          },
        ],
      }),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'insert.inline object',
      inlineObject: {name: 'stock ticker', value: {}},
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {_key: 'k1', _type: 'span', text: '', marks: []},
          {_key: 'k2', _type: 'stock ticker'},
          {_key: 'k3', _type: 'span', text: '', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    expect(
      Object.keys(
        (editor.getSnapshot().context.value![0] as PortableTextTextBlock)
          .children[1]!,
      ),
    ).toEqual(['_key', '_type'])
  })

  test('Scenario: Inserting and focusing inline object', async () => {
    const focusEvents: Array<EditorEmittedEvent> = []

    let resolveInitialSelection: () => void
    const initialSelectionPromise = new Promise<void>((resolve) => {
      resolveInitialSelection = resolve
    })

    let resolveInlineObjectSelection: () => void
    const inlineObjectSelectionPromise = new Promise<void>((resolve) => {
      resolveInlineObjectSelection = resolve
    })
    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <button
            data-testid="insert-stock-ticker"
            type="button"
            onClick={() => {
              editor.send({
                type: 'insert.inline object',
                inlineObject: {
                  name: 'stock ticker',
                  value: {
                    symbol: 'AAPL',
                  },
                },
              })
              editor.send({
                type: 'focus',
              })
            }}
          >
            Insert stock ticker
          </button>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'focused') {
                focusEvents.push(event)
              }

              if (event.type === 'selection') {
                const childSegment = event.selection?.focus.path.at(2)

                if (
                  childSegment &&
                  isKeyedSegment(childSegment) &&
                  childSegment._key === 'k1'
                ) {
                  resolveInitialSelection()
                }

                if (
                  childSegment &&
                  isKeyedSegment(childSegment) &&
                  childSegment._key === 'k2'
                ) {
                  resolveInlineObjectSelection()
                }
              }
            }}
          />
        </>
      ),
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'stock ticker',
            fields: [{type: 'string', name: 'symbol'}],
          },
        ],
      }),
    })

    const insertStockTickerButton = page.getByTestId('insert-stock-ticker')
    await vi.waitFor(() =>
      expect.element(insertStockTickerButton).toBeInTheDocument(),
    )

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(focusEvents.length).toBeGreaterThanOrEqual(1)
    })

    await initialSelectionPromise

    const focusCountBeforeInsert = focusEvents.length

    await userEvent.click(insertStockTickerButton)

    await inlineObjectSelectionPromise

    await vi.waitFor(() => {
      expect(focusEvents.length).toBeGreaterThan(focusCountBeforeInsert)
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: '', marks: []},
            {_key: 'k2', _type: 'stock ticker', symbol: 'AAPL'},
            {_key: 'k3', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.keyboard('{ArrowRight}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.type(locator, 'foo')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {_key: 'k1', _type: 'span', text: '', marks: []},
            {_key: 'k2', _type: 'stock ticker', symbol: 'AAPL'},
            {_key: 'k3', _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Inserting inline object on block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
        inlineObjects: [
          {name: 'stock ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
        backward: false,
      })
    })

    editor.send({
      type: 'insert.inline object',
      inlineObject: {
        name: 'stock ticker',
        value: {
          symbol: 'AAPL',
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        '{image}',
        ',{stock ticker},',
      ])
    })
  })
})
