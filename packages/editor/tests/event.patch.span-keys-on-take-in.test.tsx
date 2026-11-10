import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.patch span keys on take in', () => {
  test('Scenario: initialValue with a keyless span saves the key with the first edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: value,
      children: <PatchCollector patches={patches} />,
    })

    expect(patches).toEqual([])

    await userEvent.type(locator, 'y')

    const spanKey = firstSpanKey(editor)
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: spanKey,
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n+y\n foo\n',
          origin: 'local',
        },
      ])
    })
    expect(applyAll(value, patches)).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: first update value with a keyless span saves the key at once', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      children: <PatchCollector patches={patches} />,
    })

    editor.send({type: 'update value', value})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: firstSpanKey(editor),
        },
      ])
    })

    await userEvent.type(locator, 'y')

    const spanKey = firstSpanKey(editor)
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: spanKey,
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n+y\n foo\n',
          origin: 'local',
        },
      ])
    })
    expect(applyAll(value, patches)).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: initialValue followed by an equal update value saves the key with the first edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: value,
      children: <PatchCollector patches={patches} />,
    })

    editor.send({type: 'update value', value})
    await userEvent.type(locator, 'y')

    const spanKey = firstSpanKey(editor)
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: spanKey,
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n+y\n foo\n',
          origin: 'local',
        },
      ])
    })
    expect(applyAll(value, patches)).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: initialValue in StrictMode saves the key the editor holds after the remount', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const editorRef = React.createRef<Editor>()
    const {value, blockKey} = createFixture(keyGenerator)
    let ready = false

    await render(
      <React.StrictMode>
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue: value,
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'ready') {
                ready = true
              }
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </EditorProvider>
      </React.StrictMode>,
    )
    await vi.waitFor(() => expect(ready).toBe(true))
    const editor = editorRef.current!

    expect(patches).toEqual([])

    const spanKey = firstSpanKey(editor)
    const path = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.send({
      type: 'select',
      at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
    })
    editor.send({type: 'insert.text', text: 'y'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: spanKey,
        },
        {
          type: 'diffMatchPatch',
          path: [...path, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+y\n',
          origin: 'local',
        },
      ])
    })
    expect(applyAll(value, patches)).toEqual(editor.getSnapshot().context.value)
  })

  test('Scenario: first update value while read-only saves the key when the editor becomes editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)
    const editor = await renderReadOnlyEditor({keyGenerator, patches})

    editor.send({type: 'update value', value})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(4)
    })

    editor.send({type: 'update readOnly', readOnly: false})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: firstSpanKey(editor),
        },
      ])
    })
  })

  test('Scenario: update value while read-only, remote replacement of the span, unlock: no span key patch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey, spanKeys} = createFixture(keyGenerator)
    const editor = await renderReadOnlyEditor({keyGenerator, patches})

    editor.send({type: 'update value', value})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(4)
    })

    const replacedValue = replacedFixture(value, keyGenerator)
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0],
          value: firstChild(replacedValue),
          origin: 'remote',
        },
      ],
      snapshot: replacedValue,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(replacedValue)
    })

    editor.send({type: 'update readOnly', readOnly: false})
    typeAfter(editor, value[1]!._key, spanKeys[0]!)

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: value[1]!._key},
            'children',
            {_key: spanKeys[0]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+y\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: initialValue while read-only, remote replacement of the span, unlock: no span key patch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey, spanKeys} = createFixture(keyGenerator)
    const editor = await renderReadOnlyEditor({
      keyGenerator,
      patches,
      initialValue: value,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(4)
    })

    const replacedValue = replacedFixture(value, keyGenerator)
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0],
          value: firstChild(replacedValue),
          origin: 'remote',
        },
      ],
      snapshot: replacedValue,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(replacedValue)
    })

    editor.send({type: 'update readOnly', readOnly: false})
    typeAfter(editor, value[1]!._key, spanKeys[0]!)

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: value[1]!._key},
            'children',
            {_key: spanKeys[0]!},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n bar\n+y\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: update value while read-only, unlock, then an immediate edit: the key set comes before the edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)
    const editor = await renderReadOnlyEditor({keyGenerator, patches})

    editor.send({type: 'update value', value})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(4)
    })

    const spanKey = firstSpanKey(editor)
    editor.send({type: 'update readOnly', readOnly: false})
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: 'y'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: spanKey,
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n foo\n+y\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: first update value while read-only, remote insert before the span, unlock: the key set addresses the span where it is now', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const {value, blockKey} = createFixture(keyGenerator)
    const editor = await renderReadOnlyEditor({keyGenerator, patches})

    editor.send({type: 'update value', value})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(4)
    })
    const spanKey = firstSpanKey(editor)

    const inserted = {_type: 'span', _key: keyGenerator(), text: 'R', marks: []}
    const hostValue = applyAll(value, [
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', 0],
        position: 'before',
        items: [inserted],
      },
    ]) as Array<PortableTextBlock>
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', 0],
          position: 'before',
          items: [inserted],
          origin: 'remote',
        },
      ],
      snapshot: hostValue,
    })
    await vi.waitFor(() => {
      expect(
        (editor.getSnapshot().context.value[0] as any).children.map(
          (child: any) => child.text,
        ),
      ).toEqual(['R', 'foo'])
    })

    editor.send({type: 'update readOnly', readOnly: false})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          value: spanKey,
        },
      ])
    })

    typeAfter(editor, blockKey, spanKey)
    await vi.waitFor(() => {
      expect(applyAll(hostValue, patches)).toEqual(
        editor.getSnapshot().context.value,
      )
    })
    expect(patches[0]).toEqual({
      type: 'set',
      path: [{_key: blockKey}, 'children', 1, '_key'],
      value: spanKey,
    })
  })

  test('Scenario: first update value with a keyless span, an orphan markDef and an empty-children block: only the key set is emitted', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const blockKey = keyGenerator()
    const markedKey = keyGenerator()
    const markedSpanKey = keyGenerator()
    const emptyKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      children: <PatchCollector patches={patches} />,
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', text: 'foo', marks: []}],
        },
        {
          _type: 'block',
          _key: markedKey,
          style: 'normal',
          markDefs: [
            {_key: keyGenerator(), _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_type: 'span', _key: markedSpanKey, text: 'bar', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: emptyKey,
          style: 'normal',
          markDefs: [],
          children: [],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: firstSpanKey(editor),
        },
      ])
    })

    typeAfter(editor, markedKey, markedSpanKey)

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', 0, '_key'],
          value: firstSpanKey(editor),
        },
        {
          type: 'diffMatchPatch',
          path: [{_key: markedKey}, 'children', {_key: markedSpanKey}, 'text'],
          value: '@@ -1,3 +1,4 @@\n bar\n+y\n',
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: a keyless span inside a container keeps saving its key with the first edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const calloutKey = keyGenerator()
    const {value, blockKey} = createFixture(keyGenerator)

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: value,
        },
      ],
      children: (
        <>
          <NodePlugin
            nodes={[defineContainer({type: 'callout', arrayField: 'content'})]}
          />
          <PatchCollector patches={patches} />
        </>
      ),
    })

    expect(patches).toEqual([])

    await userEvent.type(locator, 'y')

    const callout = editor.getSnapshot().context.value[0] as unknown as {
      content: Array<{children: Array<{_key: string}>}>
    }
    const spanKey = callout.content[0]!.children[0]!._key
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            0,
            '_key',
          ],
          value: spanKey,
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
            'text',
          ],
          value: '@@ -1,3 +1,4 @@\n+y\n foo\n',
          origin: 'local',
        },
      ])
    })
  })

  describe('inline objects', () => {
    const schemaDefinition = defineSchema({
      inlineObjects: [
        {name: 'inlineNote', fields: [{name: 'label', type: 'string'}]},
      ],
    })

    test('Scenario: initialValue with a keyless inline object sends only the text edit', async () => {
      const keyGenerator = createTestKeyGenerator()
      const patches: Array<Patch> = []
      const {blockKey, firstKey, keyless} = createInlineFixture(keyGenerator)

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: keyless,
        children: <PatchCollector patches={patches} />,
      })

      typeInFirstSpan(editor, blockKey, firstKey)

      await vi.waitFor(() => {
        expect(patches).toEqual([
          {
            type: 'diffMatchPatch',
            path: [{_key: blockKey}, 'children', {_key: firstKey}, 'text'],
            value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
            origin: 'local',
          },
        ])
      })
    })

    test('Scenario: first update value with a keyless inline object sends only the text edit', async () => {
      const keyGenerator = createTestKeyGenerator()
      const patches: Array<Patch> = []
      const {blockKey, firstKey, keyless} = createInlineFixture(keyGenerator)

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        children: <PatchCollector patches={patches} />,
      })

      editor.send({type: 'update value', value: keyless})
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toHaveLength(1)
      })
      typeInFirstSpan(editor, blockKey, firstKey)

      await vi.waitFor(() => {
        expect(patches).toEqual([
          {
            type: 'diffMatchPatch',
            path: [{_key: blockKey}, 'children', {_key: firstKey}, 'text'],
            value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
            origin: 'local',
          },
        ])
      })
    })

    test('Scenario: a later update value that drops the key of an inline object sends the whole inline object', async () => {
      const keyGenerator = createTestKeyGenerator()
      const patches: Array<Patch> = []
      const {blockKey, firstKey, keyed, keyless} =
        createInlineFixture(keyGenerator)

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: keyed,
        children: <PatchCollector patches={patches} />,
      })

      editor.send({type: 'update value', value: keyless})
      await vi.waitFor(() => {
        expect(
          (editor.getSnapshot().context.value[0] as any).children[1]._key,
        ).not.toEqual((keyed[0] as any).children[1]._key)
      })
      const repaired = (editor.getSnapshot().context.value[0] as any)
        .children[1]
      typeInFirstSpan(editor, blockKey, firstKey)

      await vi.waitFor(() => {
        expect(patches).toEqual([
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', 1],
            value: {_key: repaired._key, _type: 'inlineNote', label: 'bar'},
          },
          {
            type: 'diffMatchPatch',
            path: [{_key: blockKey}, 'children', {_key: firstKey}, 'text'],
            value: '@@ -1,3 +1,4 @@\n foo\n+!\n',
            origin: 'local',
          },
        ])
      })
    })
  })
})

function createInlineFixture(keyGenerator: () => string) {
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const lastKey = keyGenerator()
  const noteKey = keyGenerator()
  const children = (note: Record<string, unknown>) => [
    {_type: 'span', _key: firstKey, text: 'foo', marks: []},
    note,
    {_type: 'span', _key: lastKey, text: 'baz', marks: []},
  ]

  return {
    blockKey,
    firstKey,
    keyless: [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: children({_type: 'inlineNote', label: 'bar'}),
      },
    ] satisfies Array<PortableTextBlock>,
    keyed: [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: children({
          _type: 'inlineNote',
          _key: noteKey,
          label: 'bar',
        }),
      },
    ] satisfies Array<PortableTextBlock>,
  }
}

function typeInFirstSpan(editor: Editor, blockKey: string, spanKey: string) {
  const path = [{_key: blockKey}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: '!'})
}

function PatchCollector(props: {patches: Array<Patch>}) {
  return (
    <EventListenerPlugin
      on={(event) => {
        if (event.type === 'patch') {
          props.patches.push(event.patch)
        }
      }}
    />
  )
}

// createTestEditor cannot start the editor read-only
async function renderReadOnlyEditor(options: {
  keyGenerator: () => string
  patches: Array<Patch>
  initialValue?: Array<PortableTextBlock>
}) {
  const editorRef = React.createRef<Editor>()

  await render(
    <EditorProvider
      initialConfig={{
        keyGenerator: options.keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: options.initialValue,
        readOnly: true,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
      <PatchCollector patches={options.patches} />
    </EditorProvider>,
  )
  await vi.waitFor(() => expect(editorRef.current).not.toBeNull())

  return editorRef.current!
}

function typeAfter(editor: Editor, blockKey: string, spanKey: string) {
  const path = [{_key: blockKey}, 'children', {_key: spanKey}]
  editor.send({
    type: 'select',
    at: {anchor: {path, offset: 3}, focus: {path, offset: 3}},
  })
  editor.send({type: 'insert.text', text: 'y'})
}

function firstChild(value: Array<PortableTextBlock>) {
  return (value[0] as any).children[0]
}

function firstSpanKey(editor: Editor) {
  return (editor.getSnapshot().context.value[0] as any).children[0]._key
}

function replacedFixture(
  value: Array<PortableTextBlock>,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const [first, ...rest] = value

  return [
    {
      ...first!,
      children: [
        {_type: 'span', _key: keyGenerator(), text: 'foo!', marks: []},
      ],
    },
    ...rest,
  ]
}

function createFixture(keyGenerator: () => string) {
  const blockKey = keyGenerator()
  const spanKeys = [keyGenerator(), keyGenerator(), keyGenerator()]
  const blockKeys = [keyGenerator(), keyGenerator(), keyGenerator()]
  const value: Array<PortableTextBlock> = [
    {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    ...['bar', 'baz', 'qux'].map((text, index) => ({
      _type: 'block',
      _key: blockKeys[index]!,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: spanKeys[index]!, text, marks: []}],
    })),
  ]

  return {value, blockKey, blockKeys, spanKeys}
}
