import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

describe('container render dropPosition', () => {
  test('passes dropPosition undefined to the render callback when no drag is in progress', async () => {
    const dropPositions: Array<'start' | 'end' | undefined> = []

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'callout',
          content: [
            {
              _type: 'block',
              _key: 'inner',
              children: [{_type: 'span', _key: 'span', text: 'hi', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof calloutSchema>({
              scope: '$..callout',
              field: 'content',
              render: ({attributes, children, dropPosition}) => {
                dropPositions.push(dropPosition)
                return <div {...attributes}>{children}</div>
              },
            }),
          ]}
        />
      ),
    })

    expect(dropPositions.length).toBeGreaterThan(0)
    expect(dropPositions.every((p) => p === undefined)).toBe(true)
  })

  test('passes dropPosition to the render callback when a drag targets the container', async () => {
    const dropPositions: Array<'start' | 'end' | undefined> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'callout',
          content: [
            {
              _type: 'block',
              _key: 'inner',
              children: [{_type: 'span', _key: 'span', text: 'hi', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: 'sibling',
          children: [
            {_type: 'span', _key: 'sibling-span', text: 'sibling', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof calloutSchema>({
              scope: '$..callout',
              field: 'content',
              render: ({attributes, children, dropPosition}) => {
                dropPositions.push(dropPosition)
                return (
                  <aside {...attributes} data-drop-position={dropPosition}>
                    {children}
                  </aside>
                )
              },
            }),
          ]}
        />
      ),
    })

    const siblingSelection = {
      anchor: {
        path: [{_key: 'sibling'}, 'children', {_key: 'sibling-span'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'sibling'}, 'children', {_key: 'sibling-span'}],
        offset: 7,
      },
    }

    const calloutStartSelection = {
      anchor: {
        path: [{_key: 'callout'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'callout'}],
        offset: 0,
      },
    }

    const dataTransfer = new DataTransfer()

    // Start drag from the sibling text block (drag-origin is required for
    // the drop-position behavior to track the drop target).
    editor.send({
      type: 'drag.dragstart',
      originEvent: {clientX: 0, clientY: 0, dataTransfer},
      position: {selection: siblingSelection},
    })

    // Drag over the callout block at its start edge.
    editor.send({
      type: 'drag.dragover',
      originEvent: {dataTransfer},
      dragOrigin: {selection: siblingSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: calloutStartSelection,
      },
    })

    await vi.waitFor(() => {
      expect(dropPositions.at(-1)).toBe('start')
    })
  })
})
