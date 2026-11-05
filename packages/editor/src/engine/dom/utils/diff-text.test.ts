import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../../../test-utils/create-test-snapshot'
import {defineContainer} from '../../../renderers/renderer.types'
import {resolveContainers} from '../../../schema/resolve-containers-batch'
import {createEditor} from '../../create-editor'
import type {Path} from '../../interfaces/path'
import {withDOM} from '../plugin/with-dom'
import {transformPendingPoint} from './diff-text'

const schema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}, {type: 'callout'}],
          },
        ],
      },
      {
        name: 'note',
        fields: [
          {
            name: 'body',
            type: 'array',
            of: [
              {
                type: 'block',
                styles: [{name: 'normal'}, {name: 'h1'}],
                decorators: [{name: 'em'}],
              },
            ],
          },
        ],
      },
    ],
  }),
)

const containers = resolveContainers(schema, [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
])

describe.each([
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
])(`${transformPendingPoint.name} $depth`, ({wrap}) => {
  test('a caret after a pending deletion stays at the deletion when a text set shrinks the span', () => {
    const {editor, spanPath} = setUp(wrap)
    editor.pendingDiffs = [
      {id: 0, path: spanPath, diff: {start: 0, end: 6, text: ''}},
    ]

    expect(
      transformPendingPoint(
        editor,
        {path: spanPath, offset: 3},
        {type: 'set', path: [...spanPath, 'text'], value: 'foo'},
      ),
    ).toEqual({path: spanPath, offset: 0})
  })

  test('a caret after a pending insertion stays after the insertion when a text set shrinks the span', () => {
    const {editor, spanPath} = setUp(wrap)
    editor.pendingDiffs = [
      {id: 0, path: spanPath, diff: {start: 9, end: 9, text: 'bar'}},
    ]

    expect(
      transformPendingPoint(
        editor,
        {path: spanPath, offset: 12},
        {type: 'set', path: [...spanPath, 'text'], value: 'foo'},
      ),
    ).toEqual({path: spanPath, offset: 6})
  })
})

function setUp(wrap: Wrap) {
  const keyGenerator = createTestKeyGenerator()
  const {wrapValue, prefix} = wrap(keyGenerator)
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const editor = withDOM(createEditor())
  editor.snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      keyGenerator,
      value: wrapValue([
        {
          _type: schema.block.name,
          _key: blockKey,
          children: [
            {
              _type: schema.span.name,
              _key: spanKey,
              text: 'foobarbaz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]),
    },
  })

  return {
    editor,
    spanPath: [...prefix, {_key: blockKey}, 'children', {_key: spanKey}],
  }
}

type Wrap = (keyGenerator: () => string) => {
  wrapValue: (blocks: Array<PortableTextBlock>) => Array<PortableTextBlock>
  prefix: Path
}

function atRoot(): ReturnType<Wrap> {
  return {wrapValue: (blocks) => blocks, prefix: []}
}

function inCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const calloutKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {_type: 'callout', _key: calloutKey, content: blocks},
    ],
    prefix: [{_key: calloutKey}, 'content'],
  }
}

function inNestedCallout(keyGenerator: () => string): ReturnType<Wrap> {
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {
        _type: 'callout',
        _key: outerKey,
        content: [{_type: 'callout', _key: innerKey, content: blocks}],
      },
    ],
    prefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
  }
}

function inNote(keyGenerator: () => string): ReturnType<Wrap> {
  const noteKey = keyGenerator()

  return {
    wrapValue: (blocks) => [{_type: 'note', _key: noteKey, body: blocks}],
    prefix: [{_key: noteKey}, 'body'],
  }
}
