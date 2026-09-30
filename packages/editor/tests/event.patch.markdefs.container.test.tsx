import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionAfterText,
  getTextSelection,
} from '../test-utils/text-selection'

const schemaDefinition = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const calloutContainers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

const tableContainers = [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('event.patch markDefs in containers', () => {
  test('Scenario: Adding and undoing an annotation in a callout emits keyed patches at the nested path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'annotation.add',
      at: getTextSelection(editor.getSnapshot().context, 'foo'),
      annotation: {
        name: 'link',
        value: {href: 'https://example.com'},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: ['k5']},
              ],
              markDefs: [
                {_key: 'k5', _type: 'link', href: 'https://example.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [{_key: calloutKey}, 'content', {_key: blockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'markDefs',
            0,
          ],
          items: [{_key: 'k5', _type: 'link', href: 'https://example.com'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
            'marks',
          ],
          value: ['k5'],
        },
      ])
    })

    patches.length = 0

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
            'marks',
          ],
          value: [],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'markDefs',
            {_key: 'k5'},
          ],
        },
      ])
    })
  })

  test('Scenario: Adding an annotation in a table cell emits keyed patches at the nested path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={tableContainers} />
        </>
      ),
      initialValue: [
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cellKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: blockKey,
                      _type: 'block',
                      children: [
                        {_key: spanKey, _type: 'span', text: 'foo', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'annotation.add',
      at: getTextSelection(editor.getSnapshot().context, 'foo'),
      annotation: {
        name: 'link',
        value: {href: 'https://example.com'},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cellKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: blockKey,
                      _type: 'block',
                      children: [
                        {
                          _key: spanKey,
                          _type: 'span',
                          text: 'foo',
                          marks: ['k7'],
                        },
                      ],
                      markDefs: [
                        {
                          _key: 'k7',
                          _type: 'link',
                          href: 'https://example.com',
                        },
                      ],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'markDefs',
          ],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'markDefs',
            0,
          ],
          items: [{_key: 'k7', _type: 'link', href: 'https://example.com'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
            'marks',
          ],
          value: ['k7'],
        },
      ])
    })
  })

  test('Scenario: Setting annotation props in a callout emits a keyed set at the nested path', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const defKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
              ],
              markDefs: [
                {_key: defKey, _type: 'link', href: 'https://foo.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'annotation.set',
      at: [
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'markDefs',
        {_key: defKey},
      ],
      props: {href: 'https://bar.com'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: [defKey]},
              ],
              markDefs: [
                {_key: defKey, _type: 'link', href: 'https://bar.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'markDefs',
            {_key: defKey},
          ],
          value: {_key: defKey, _type: 'link', href: 'https://bar.com'},
        },
      ])
    })
  })

  test('Scenario: Editing a callout block prunes its unused definition with a keyed unset', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const defKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={calloutContainers} />
        </>
      ),
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foo', marks: []},
              ],
              markDefs: [
                {_key: defKey, _type: 'link', href: 'https://foo.com'},
              ],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })
    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
            'text',
          ],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
        {
          origin: 'local',
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'markDefs',
            {_key: defKey},
          ],
        },
      ])
    })
  })
})
