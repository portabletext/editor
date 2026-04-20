import {applyAll} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Patch} from '../src'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('merge blocks + undo emits well-formed patches', () => {
  test('Backspace merge at root + undo does not emit malformed patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: block2Key,
        children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const patches: Array<Patch> = []

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue,
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 0,
        },
        focus: {
          path: [{_key: block2Key}, 'children', {_key: span2Key}],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    const expectedPostMerge = [
      {
        _type: 'block',
        _key: block1Key,
        children: [{_type: 'span', _key: span1Key, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(expectedPostMerge)
    })

    // Capture patches emitted from undo only.
    patches.length = 0
    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    // Replaying the emitted undo patches on the post-merge value must not
    // throw and must reproduce the pre-merge state.
    expect(() => applyAll(expectedPostMerge, patches)).not.toThrow()
  })

  test('Backspace merge inside a container + undo does not emit malformed patches', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: block1Key,
            children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: block2Key,
            children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    const patches: Array<Patch> = []

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
      initialValue,
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                scope: '$..callout',
                field: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: block2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Backspace}')

    const expectedPostMerge = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: block1Key,
            children: [
              {_type: 'span', _key: span1Key, text: 'foobar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(expectedPostMerge)
    })

    patches.length = 0
    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    expect(() => applyAll(expectedPostMerge, patches)).not.toThrow()
  })
})
