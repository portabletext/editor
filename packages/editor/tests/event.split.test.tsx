import {page, userEvent} from '@vitest/browser/context'
import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema-definition'
import {getSelectionText} from '../src/internal-utils/selection-text'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.split', () => {
  test('Scenario: Splitting mid-block before inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue: [
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
                {
                  _key: keyGenerator(),
                  _type: 'stock-ticker',
                  value: 'AAPL',
                },
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo,[stock-ticker],'])
    })

    editorRef.current?.send({
      type: 'select',
      at: getSelectionAfterText(
        editorRef.current.getSnapshot().context.value,
        'foo',
      ),
    })

    editorRef.current?.send({
      type: 'split',
    })

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'foo',
      ',[stock-ticker],',
    ])
  })

  test('Scenario: Splitting text block with custom properties', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
          initialValue: [
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo bar baz'},
              ],
              _foo: 'bar',
              baz: 42,
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo bar baz'])
    })

    editorRef.current?.send({
      type: 'select',
      at: getSelectionAfterText(
        editorRef.current.getSnapshot().context.value,
        'foo',
      ),
    })

    editorRef.current?.send({
      type: 'split',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
        _foo: 'bar',
        baz: 42,
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [{_key: 'k5', _type: 'span', text: ' bar baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Splitting inline object is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            inlineObjects: [{name: 'stock-ticker'}],
          }),
          initialValue: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {
                  _key: fooKey,
                  _type: 'span',
                  text: 'foo',
                  marks: [],
                },
                {
                  _key: stockTickerKey,
                  _type: 'stock-ticker',
                  value: 'AAPL',
                },
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: '',
                  marks: [],
                },
              ],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo,[stock-ticker],'])
    })

    const locator = page.getByRole('textbox')
    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.selection).toEqual(
        {
          anchor: {
            offset: 0,
            path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          },
          focus: {
            offset: 0,
            path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
          },
          backward: false,
        },
      )
    })

    editorRef.current?.send({type: 'split'})

    await userEvent.keyboard('{ArrowRight}')

    await userEvent.type(locator, 'bar')

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'foo,[stock-ticker],bar',
    ])
  })

  test('Scenario: Splitting block object is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const imageKey = keyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: imageKey,
              _type: 'image',
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [{_key: keyGenerator(), _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['[image]', 'bar'])
    })

    const locator = page.getByRole('textbox')
    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: imageKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(
        getSelectionText(
          editorRef.current?.getSnapshot().context.value,
          editorRef.current?.getSnapshot().context.selection!,
        ),
      ).toEqual(['[image]'])
    })

    editorRef.current?.send({type: 'split'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['[image]', 'bar'])
    })
  })

  test('Scenario: Splitting with an expanded selection starting on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const blockKey = keyGenerator()
    const barKey = keyGenerator()
    const imageKey = keyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
            },
            {
              _key: imageKey,
              _type: 'image',
            },
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: barKey, _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '[image]', 'bar'])
    })

    const locator = page.getByRole('textbox')
    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {
          offset: 0,
          path: [{_key: imageKey}],
        },
        focus: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: barKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.selection).toEqual(
        {
          anchor: {
            offset: 0,
            path: [{_key: imageKey}],
          },
          focus: {
            offset: 1,
            path: [{_key: blockKey}, 'children', {_key: barKey}],
          },
          backward: false,
        },
      )
    })

    editorRef.current?.send({type: 'split'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', 'ar'])
    })

    await userEvent.type(locator, 'baz')

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'foo',
      'bazar',
    ])
  })

  test('Scenario: Splitting with an expanded selection ending on a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const imageKey = keyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: blockKey,
              _type: 'block',
              children: [{_key: fooKey, _type: 'span', text: 'foo'}],
            },
            {
              _key: imageKey,
              _type: 'image',
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              children: [{_key: keyGenerator(), _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '[image]', 'bar'])
    })

    const locator = page.getByRole('textbox')
    await userEvent.click(locator)

    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {
          offset: 1,
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
        },
        focus: {
          offset: 0,
          path: [{_key: imageKey}],
        },
      },
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.selection).toEqual(
        {
          anchor: {
            offset: 1,
            path: [{_key: blockKey}, 'children', {_key: fooKey}],
          },
          focus: {
            offset: 0,
            path: [{_key: imageKey}],
          },
          backward: false,
        },
      )
    })

    editorRef.current?.send({type: 'split'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['f', 'bar'])
    })

    await userEvent.type(locator, 'baz')

    expect(getTersePt(editorRef.current?.getSnapshot().context.value)).toEqual([
      'f',
      'bazbar',
    ])
  })
})
