import {defineContainer} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {getFocusTextBlock} from '@portabletext/editor/selectors'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {defineInputRule} from './input-rule'
import {InputRulePlugin} from './plugin.input-rule'

// Mirrors the structured-lists container example: typing a markdown list
// marker at the start of a block deletes the marker and lifts the block,
// trailing content included, into the first item of a new `list`
// container.
const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
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
})

const containers = [
  defineContainer({
    type: 'list',
    arrayField: 'items',
    render: ({attributes, children}) => <ul {...attributes}>{children}</ul>,
    of: [
      defineContainer({
        type: 'list-item',
        arrayField: 'content',
        render: ({attributes, children}) => <li {...attributes}>{children}</li>,
      }),
    ],
  }),
]

function listInputRule(kind: 'bullet' | 'number', on: RegExp) {
  return defineInputRule({
    on,
    actions: [
      // Rule actions are evaluated eagerly against the pre-insertion
      // snapshot, so they only raise events with statically known
      // payloads. The machinery forwards the original `insert.text`
      // before executing them, so the match's `targetOffsets` (block
      // offsets in the post-insertion text) address exactly what the
      // document contains; `match.selection` is estimated against the
      // pre-insertion document and falls one character short.
      ({event}) => {
        const match = event.matches.at(0)
        if (!match) {
          return []
        }
        return [
          raise({type: 'delete', at: match.targetOffsets}),
          raise({type: 'custom.convert to list', kind}),
        ]
      },
    ],
  })
}

// Raised events perform against live state, so this behavior sees the
// block after the marker delete has applied.
const convertToList = defineBehavior<
  {kind: 'bullet' | 'number'},
  'custom.convert to list',
  {focusBlock: NonNullable<ReturnType<typeof getFocusTextBlock>>}
>({
  on: 'custom.convert to list',
  guard: ({snapshot}) => {
    const focusBlock = getFocusTextBlock(snapshot)
    return focusBlock ? {focusBlock} : false
  },
  actions: [
    ({event}, {focusBlock}) => [
      raise({type: 'delete.block', at: focusBlock.path}),
      raise({
        type: 'insert.block',
        block: {
          _type: 'list',
          kind: event.kind,
          items: [{_type: 'list-item', content: [focusBlock.node]}],
        },
        placement: 'auto',
        select: 'start',
      }),
    ],
  ],
})

const rules = [
  listInputRule('bullet', /^[-*] $/),
  listInputRule('number', /^\d+\. $/),
]

test('Scenario: typing a bullet marker in an empty block converts it to a list', async () => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <InputRulePlugin rules={rules} />
        <BehaviorPlugin behaviors={[convertToList]} />
      </>
    ),
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  // Typed as separate events, the way real typing arrives: the marker
  // must already be in the document when the trigger character fires the
  // rule.
  editor.send({type: 'insert.text', text: '-'})
  editor.send({type: 'insert.text', text: ' '})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k3',
        _type: 'list',
        kind: 'bullet',
        items: [
          {
            _key: 'k2',
            _type: 'list-item',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [{_key: 's0', _type: 'span', marks: [], text: ''}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })
})

test('Scenario: typing a bullet marker before existing text lifts the text into the list', async () => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <InputRulePlugin rules={rules} />
        <BehaviorPlugin behaviors={[convertToList]} />
      </>
    ),
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  // Typed as separate events, the way real typing arrives: the marker
  // must already be in the document when the trigger character fires the
  // rule.
  editor.send({type: 'insert.text', text: '-'})
  editor.send({type: 'insert.text', text: ' '})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k3',
        _type: 'list',
        kind: 'bullet',
        items: [
          {
            _key: 'k2',
            _type: 'list-item',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', marks: [], text: 'hello'},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {_key: 'k3'},
        'items',
        {_key: 'k2'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
    },
    backward: false,
    focus: {
      path: [
        {_key: 'k3'},
        'items',
        {_key: 'k2'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 0,
    },
  })
})

test('Scenario: a bullet marker arriving in a single event converts the block', async () => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <InputRulePlugin rules={rules} />
        <BehaviorPlugin behaviors={[convertToList]} />
      </>
    ),
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  // The whole marker in one event, the way a paste or IME commit
  // delivers it. This is also the shape that hides the eager-evaluation
  // staleness bug (the pre-insertion block is coincidentally clean), so
  // it is pinned to keep working alongside the character-by-character
  // scenarios rather than instead of them.
  editor.send({type: 'insert.text', text: '- '})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k3',
        _type: 'list',
        kind: 'bullet',
        items: [
          {
            _key: 'k2',
            _type: 'list-item',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', marks: [], text: 'hello'},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })
})

test('Scenario: a bold marker with bold toggled off before the trigger space still converts', async () => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: [
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <NodePlugin nodes={containers} />
        <InputRulePlugin rules={rules} />
        <BehaviorPlugin behaviors={[convertToList]} />
      </>
    ),
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
    },
  })
  // The marker ends up straddling two spans (a bold `-` and a plain
  // ` `), so the delete at `targetOffsets` must span the boundary.
  editor.send({type: 'decorator.toggle', decorator: 'strong'})
  editor.send({type: 'insert.text', text: '-'})
  editor.send({type: 'decorator.toggle', decorator: 'strong'})
  editor.send({type: 'insert.text', text: ' '})

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k4',
        _type: 'list',
        kind: 'bullet',
        items: [
          {
            _key: 'k3',
            _type: 'list-item',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  // The range delete merges back into the first span of
                  // the deleted range, so the emptied span keeps the bold
                  // mark.
                  {_key: 's0', _type: 'span', marks: ['strong'], text: ''},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ])
  })
})
