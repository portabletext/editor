import {page} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema-definition'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('event.delete', () => {
  test('Scenario: Deleting collapsed selection', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _type: 'block',
              _key: 'k0',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'foo',
                },
              ],
            },
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {
                  _type: 'span',
                  _key: 'k3',
                  text: 'bar',
                },
              ],
            },
            {
              _type: 'image',
              _key: 'k4',
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', 'bar', '{image}'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foobar', '{image}'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foobar'])
    })
  })

  test('Scenario: Deleting entire editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editorRef} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: imageKey,
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '{image}', 'bar'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual([''])
    })
  })

  test('Scenario: Deleting selection hanging around a block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: 'foo'}],
            },
            {
              _key: 'k2',
              _type: 'image',
            },
            {
              _key: 'k3',
              _type: 'block',
              children: [{_key: 'k4', _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '{image}', 'bar'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #2', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: 'foo'}],
            },
            {
              _key: 'k2',
              _type: 'image',
            },
            {
              _key: 'k3',
              _type: 'block',
              children: [{_key: 'k4', _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '{image}', 'bar'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        backward: true,
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['bar'])
    })
  })

  test('Scenario: Deleting selection hanging around a block object #3', async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [{name: 'image'}],
          }),
          initialValue: [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: 'foo'}],
            },
            {
              _key: 'k2',
              _type: 'image',
            },
            {
              _key: 'k3',
              _type: 'block',
              children: [{_key: 'k4', _type: 'span', text: 'bar'}],
            },
          ],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo', '{image}', 'bar'])
    })

    editorRef.current?.send({
      type: 'delete',
      at: {
        anchor: {
          path: [{_key: 'k3'}, 'children', {_key: 'k4'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value),
      ).toEqual(['foo'])
    })
  })
})
