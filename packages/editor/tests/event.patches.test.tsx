import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorEmittedEvent,
} from '../src'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin, EventListenerPlugin} from '../src/plugins'

function getEditors() {
  const editorARef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()
  const editorAKeyGenerator = createTestKeyGenerator('ea-')
  const editorBKeyGenerator = createTestKeyGenerator('eb-')
  const onEditorAEvent = vi.fn<(event: EditorEmittedEvent) => void>()
  const onEditorBEvent = vi.fn<(event: EditorEmittedEvent) => void>()

  const editors = (
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator: editorAKeyGenerator,
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorARef} />
        <EventListenerPlugin
          on={(event) => {
            onEditorAEvent(event)

            if (event.type === 'patch') {
              editorBRef.current?.send({
                type: 'patches',
                patches: [{...event.patch, origin: 'remote'}],
                snapshot: editorARef.current?.getSnapshot().context.value,
              })
            }
          }}
        />
        <PortableTextEditable data-testid="editor-a" />
      </EditorProvider>
      <EditorProvider
        initialConfig={{
          keyGenerator: editorBKeyGenerator,
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorBRef} />
        <EventListenerPlugin
          on={(event) => {
            onEditorBEvent(event)

            if (event.type === 'patch') {
              editorARef.current?.send({
                type: 'patches',
                patches: [{...event.patch, origin: 'remote'}],
                snapshot: editorBRef.current?.getSnapshot().context.value,
              })
            }
          }}
        />
        <PortableTextEditable data-testid="editor-b" />
      </EditorProvider>
    </>
  )

  return {
    editorARef,
    editorBRef,
    onEditorAEvent,
    onEditorBEvent,
    editors,
  }
}

describe('event.patches', () => {
  test('Scenario: Consuming initial diffMatchPatch', async () => {
    const {editorARef, editorBRef, onEditorAEvent, editors} = getEditors()

    render(editors)

    const editorALocator = page.getByTestId('editor-a')
    const editorBLocator = page.getByTestId('editor-b')

    await vi.waitFor(async () => {
      await expect.element(editorALocator).toBeInTheDocument()
      await expect.element(editorBLocator).toBeInTheDocument()
    })

    await userEvent.type(editorALocator, 'f')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
            },
          ],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'diffMatchPatch',
          origin: 'local',
          path: [{_key: 'ea-k0'}, 'children', {_key: 'ea-k1'}, 'text'],
          value: '@@ -0,0 +1 @@\n+f\n',
        },
      })
    })

    await vi.waitFor(() => {
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: 'f', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Consuming initial insert patch', async () => {
    const {editorARef, editorBRef, onEditorAEvent, editors} = getEditors()

    render(editors)

    const editorALocator = page.getByTestId('editor-a')
    const editorBLocator = page.getByTestId('editor-b')

    await vi.waitFor(async () => {
      await expect.element(editorALocator).toBeInTheDocument()
      await expect.element(editorBLocator).toBeInTheDocument()
    })

    editorARef.current?.send({type: 'focus'})
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
            },
          ],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [{_key: 'ea-k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'ea-k2',
              children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
    })

    await vi.waitFor(() => {
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Splitting initial block', async () => {
    const {editorARef, editorBRef, onEditorAEvent, editors} = getEditors()

    render(editors)

    const editorALocator = page.getByTestId('editor-a')
    const editorBLocator = page.getByTestId('editor-b')

    await vi.waitFor(async () => {
      await expect.element(editorALocator).toBeInTheDocument()
      await expect.element(editorBLocator).toBeInTheDocument()
    })

    await userEvent.click(editorALocator)
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'setIfMissing',
          origin: 'local',
          path: [],
          value: [],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'ea-k0',
              children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
      expect(onEditorAEvent).toHaveBeenCalledWith({
        type: 'patch',
        patch: {
          type: 'insert',
          origin: 'local',
          path: [{_key: 'ea-k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'ea-k2',
              children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      })
    })

    await vi.waitFor(() => {
      expect(editorARef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editorBRef.current?.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'ea-k0',
          children: [{_type: 'span', _key: 'ea-k1', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'ea-k2',
          children: [{_type: 'span', _key: 'ea-k3', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Patching while syncing initial value', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()
    const listBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {
          _key: keyGenerator(),
          _type: 'span',
          text: 'foo',
          marks: [],
        },
      ],
      level: 1,
      listItem: 'bullet',
      markDefs: [],
      style: 'normal',
    }
    const headingBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'h1',
    }

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            lists: [{name: 'bullet'}],
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
          initialValue: [listBlock],
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'remote',
        },
        {
          type: 'insert',
          position: 'before',
          path: [
            {
              _key: listBlock._key,
            },
          ],
          items: [headingBlock],
          origin: 'remote',
        },
      ],
      snapshot: [headingBlock, listBlock],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        headingBlock,
        listBlock,
      ])
    })
  })

  test('Scenario: Patching while syncing incoming value', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()
    const listBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {
          _key: keyGenerator(),
          _type: 'span',
          text: 'foo',
          marks: [],
        },
      ],
      level: 1,
      listItem: 'bullet',
      markDefs: [],
      style: 'normal',
    }
    const headingBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'h1',
    }

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            lists: [{name: 'bullet'}],
            styles: [{name: 'normal'}, {name: 'h1'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EventListenerPlugin on={onEvent} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'update value',
      value: [listBlock],
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'remote',
        },
        {
          type: 'insert',
          position: 'before',
          path: [
            {
              _key: listBlock._key,
            },
          ],
          items: [headingBlock],
          origin: 'remote',
        },
      ],
      snapshot: [headingBlock, listBlock],
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        headingBlock,
        listBlock,
      ])
    })
  })

  test('`set` block object properties', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {
                name: 'url',
                fields: [
                  {name: 'description', type: 'string'},
                  {name: 'href', type: 'string'},
                ],
              },
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'insert.block object',
      blockObject: {
        name: 'url',
        value: {
          href: 'https://www.sanity.io',
        },
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'description'],
          value: 'Sanity is a headless CMS',
        },
      ],
      snapshot: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          description: 'Sanity is a headless CMS',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('`set` nested block object properties', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({
            blockObjects: [
              {
                name: 'url',
                fields: [
                  {name: 'content', type: 'object'},
                  {name: 'href', type: 'string'},
                ],
              },
            ],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'insert.block object',
      blockObject: {
        name: 'url',
        value: {
          href: 'https://www.sanity.io',
        },
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'content'],
          value: {},
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: 'k2'}, 'content', 'description'],
          value: 'Sanity is a headless CMS',
        },
      ],
      snapshot: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'Sanity is a headless CMS',
          },
        },
      ],
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          content: {
            description: 'Sanity is a headless CMS',
          },
        },
      ])
    })
  })

  // TODO: We should revisit this and allow `set` inside text blocks
  test('Scenario: `set`ing inside text block is a noop', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const markDefKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
      {
        _key: blockKey,
        _type: 'block',
        children: [
          {
            _key: fooKey,
            _type: 'span',
            text: 'foo ',
            marks: [markDefKey],
          },
        ],
        markDefs: [
          {
            _key: markDefKey,
            _type: 'link',
          },
        ],
        style: 'normal',
      },
      {
        _key: imageKey,
        _type: 'image',
      },
    ]

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          initialValue,
          schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual(
        initialValue,
      )
    })

    editorRef.current?.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: blockKey}, 'markDefs', {_key: markDefKey}],
          value: {href: 'https://www.sanity.io'},
        },
        {
          type: 'set',
          origin: 'remote',
          path: [{_key: imageKey}, 'alt'],
          value: 'An image',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      return expect(editorRef.current?.getSnapshot().context.value).toEqual([
        initialValue[0],
        {
          _key: imageKey,
          _type: 'image',
          alt: 'An image',
        },
      ])
    })
  })
})
