import {applyAll, type JSONValue, type Patch} from '@portabletext/patches'
import {
  defineSchema,
  getSubSchema,
  isTextBlock,
  isSpan,
  isTypedObject,
  type PortableTextBlock,
  type Schema,
} from '@portabletext/schema'
import {createTestKeyGenerator, fromTextspec} from '@portabletext/test'
import {Before, Given, Then, When, createParameterType} from 'racejar'
import {Feature} from 'racejar/vitest'
import {afterEach, beforeEach, expect, vi} from 'vitest'
import featureText from '../gherkin-spec/non-object-entries.feature?raw'
import {safeParse, safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'
import {getAncestors} from '../src/traversal/get-ancestors'
import {getNodes} from '../src/traversal/get-nodes'
import {walkPath} from '../src/traversal/walk-path'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  try {
    expect(console.error).not.toHaveBeenCalled()
  } finally {
    vi.restoreAllMocks()
  }
})

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
              styles: [{name: 'normal'}],
              decorators: [{name: 'em'}],
            },
          ],
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
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
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

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'note',
    arrayField: 'body',
    render: ({children}) => <>{children}</>,
  }),
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

type Entry = null | string | number | boolean | never[]
type Anchor = {kind: string; text: string}
type NonObjectContext = Context & {
  replica: unknown[]
  tracking: boolean
}

Feature({
  featureText,
  hooks: [
    Before(async (context: NonObjectContext) => {
      context.tracking = false
      await mountEditor(context)
    }),
  ],
  stepDefinitions: [
    ...stepDefinitions,
    Given(
      'the editor starts as {string} with {entry} after the {anchor}',
      async (
        context: NonObjectContext,
        textspec: string,
        entry: Entry,
        anchor: Anchor,
      ) => {
        const value = parseValue(context, textspec)
        const target = locate(context, value, anchor)
        target.array.splice(target.index + 1, 0, entry!)
        context.replica = structuredClone(value)
        context.tracking = true
        await mountEditor(context, value)
      },
    ),
    When(
      'a collaborator inserts {entry} after the {anchor}',
      (context: NonObjectContext, entry: Entry, anchor: Anchor) => {
        const value = structuredClone(
          context.editor.getSnapshot().context.value,
        )
        const target = locate(context, value, anchor)
        target.array.splice(target.index + 1, 0, entry!)
        sendPatches(context, value, [
          {
            type: 'insert',
            path: target.path,
            position: 'after',
            items: [entry!],
          },
        ])
      },
    ),
    When(
      'a collaborator sets the {anchor} to {entry}',
      (context: NonObjectContext, anchor: Anchor, entry: Entry) => {
        const value = structuredClone(
          context.editor.getSnapshot().context.value,
        )
        const target = locate(context, value, anchor)
        target.array.splice(target.index, 1, entry!)
        sendPatches(context, value, [
          {type: 'set', path: target.path, value: entry!},
        ])
      },
    ),
    When(
      'a collaborator sets the second entry in the array holding the {anchor} to {entry}',
      (context: NonObjectContext, anchor: Anchor, entry: Entry) => {
        const value = structuredClone(
          context.editor.getSnapshot().context.value,
        )
        const target = locate(context, value, anchor)
        target.array.splice(1, 1, entry!)
        sendPatches(context, value, [
          {type: 'set', path: [...target.path.slice(0, -1), 1], value: entry!},
        ])
      },
    ),
    When(
      'a collaborator sets the value to {string} with {entry} after the {anchor}',
      (
        context: NonObjectContext,
        textspec: string,
        entry: Entry,
        anchor: Anchor,
      ) => {
        const value = parseValue(context, textspec)
        const target = locate(context, value, anchor)
        target.array.splice(target.index + 1, 0, entry!)
        sendPatches(context, value, [
          {type: 'set', path: [], value: value as JSONValue[]},
        ])
      },
    ),
    When(
      'a collaborator sets the array holding the {anchor} to the {replacement} with {entry} after its first entry',
      (
        context: NonObjectContext,
        anchor: Anchor,
        replacement: {kind: string; textspec: string},
        entry: Entry,
      ) => {
        const value = structuredClone(
          context.editor.getSnapshot().context.value,
        )
        const target = locate(context, value, anchor)
        const {kind: arrayKind, textspec} = replacement
        const parsed = parseValue(context, textspec)
        const first = parsed[0]
        const array =
          arrayKind === 'nodes'
            ? parsed
            : first && isTextBlock(context.editor.getSnapshot().context, first)
              ? arrayKind === 'spans'
                ? first.children
                : (first.markDefs ?? []).map((definition) => {
                    const existing = target.array.find(
                      (node) =>
                        isTypedObject(node) &&
                        node['href'] === definition['href'],
                    )
                    if (
                      !isTypedObject(existing) ||
                      typeof existing['_key'] !== 'string'
                    ) {
                      throw new Error(
                        `Cannot find existing link ${definition['href']}`,
                      )
                    }
                    return {...definition, _key: existing['_key']}
                  })
              : undefined
        if (!array) {
          throw new Error(`Cannot read ${arrayKind} from ${textspec}`)
        }
        target.array.splice(0, target.array.length, ...array)
        target.array.splice(1, 0, entry!)
        sendPatches(context, value, [
          {
            type: 'set',
            path: target.path.slice(0, -1),
            value: target.array as JSONValue[],
          },
        ])
      },
    ),
    When(
      'a collaborator inserts {entry} before the first block and {entry} after the last block',
      (context: NonObjectContext, first: Entry, last: Entry) => {
        const patches: Patch[] = [
          {type: 'insert', path: [0], position: 'before', items: [first!]},
          {type: 'insert', path: [-1], position: 'after', items: [last!]},
        ]
        sendPatches(
          context,
          applyAll(context.editor.getSnapshot().context.value, patches),
          patches,
        )
      },
    ),
    Then(
      'no node array in the value holds a non-object entry',
      async (context: NonObjectContext) => {
        await vi.waitFor(() => {
          const {schema, value} = context.editor.getSnapshot().context
          assertNodeArray(value, '$', schema, schema)
        })
      },
    ),
    Then(
      "the host's copy matches the editor",
      async (context: NonObjectContext) => {
        await vi.waitFor(() =>
          expect(context.replica).toEqual(
            context.editor.getSnapshot().context.value,
          ),
        )
      },
    ),
  ],
  parameterTypes: [
    ...parameterTypes,
    createParameterType<Entry>({
      name: 'entry',
      matcher: /(null|"bar"|5|false|\[\])/,
      transform: (input) => {
        switch (input) {
          case 'null':
            return null
          case '"bar"':
            return 'bar'
          case '5':
            return 5
          case 'false':
            return false
          case '[]':
            return []
        }
        throw new Error(`Unknown entry ${input}`)
      },
    }),
    createParameterType<Anchor>({
      name: 'anchor',
      matcher:
        /((?:block|span|link|first row holding|first cell holding) "[^"]+")/,
      transform: (input) => {
        const separator = input.indexOf(' "')
        return {
          kind: input.slice(0, separator),
          text: input.slice(separator + 2, -1),
        }
      },
    }),
    createParameterType<{kind: string; textspec: string}>({
      name: 'replacement',
      matcher: /((?:nodes|spans|links) in "(?:[^"\\]|\\.)*")/,
      transform: (input) => {
        const separator = input.indexOf(' in ')
        const textspec = safeParse(input.slice(separator + 4))
        if (typeof textspec !== 'string') {
          throw new Error(`Expected quoted textspec in ${input}`)
        }
        return {kind: input.slice(0, separator), textspec}
      },
    }),
  ],
})

async function mountEditor(
  context: NonObjectContext,
  initialValue?: PortableTextBlock[],
) {
  const {editor, locator} = await createTestEditor({
    schemaDefinition,
    keyGenerator: createTestKeyGenerator(),
    initialValue: structuredClone(initialValue),
    children: (
      <>
        <NodePlugin nodes={containers} />
        <EventListenerPlugin
          on={(event) => {
            if (
              context.tracking &&
              event.type === 'change' &&
              'patches' in event
            ) {
              context.replica = applyAll(context.replica, event.patches)
            }
          }}
        />
      </>
    ),
  })
  context.editor = editor
  context.locator = locator
  context.keyMap = new Map()
}

function parseValue(context: NonObjectContext, textspec: string) {
  const {schema, keyGenerator, containers} =
    context.editor.getSnapshot().context
  return fromTextspec(
    {schema, keyGenerator, containers},
    textspec.replace(/;;/g, '\n'),
  ).blocks
}

function sendPatches(
  context: NonObjectContext,
  incomingValue: unknown[],
  patches: Patch[],
) {
  context.replica = structuredClone(incomingValue)
  context.tracking = true
  context.editor.send({type: 'apply', patches})
}

function locate(
  context: NonObjectContext,
  value: PortableTextBlock[],
  anchor: Anchor,
): {path: Patch['path']; array: unknown[]; index: number} {
  const snapshot = context.editor.getSnapshot()
  const current = {...snapshot, context: {...snapshot.context, value}}
  if (anchor.kind === 'link') {
    for (const {node, path} of getNodes(current)) {
      if (!isTextBlock(current.context, node)) {
        continue
      }
      const index =
        node.markDefs?.findIndex(
          (definition) => definition['href'] === anchor.text,
        ) ?? -1
      const definition = node.markDefs?.[index]
      if (definition && node.markDefs) {
        return {
          path: [...path, 'markDefs', {_key: definition._key}],
          array: node.markDefs,
          index,
        }
      }
    }
    throw new Error(`Cannot find link with href ${anchor.text}`)
  }
  const span = [...getNodes(current)].find(
    ({node}) => isSpan(current.context, node) && node.text === anchor.text,
  )
  if (!span) {
    throw new Error(`Cannot find span containing ${anchor.text}`)
  }
  let path = span.path
  if (anchor.kind === 'block') {
    path = path.slice(0, -2)
  } else if (anchor.kind !== 'span') {
    const ancestor = getAncestors(current, path).find(
      ({node}) =>
        node._type ===
        anchor.kind.replace('first ', '').replace(' holding', ''),
    )
    if (!ancestor) {
      throw new Error(`Cannot find ${anchor.kind} ${anchor.text}`)
    }
    path = ancestor.path
  }
  const result = walkPath(current, path)
  const walked = result.status === 'found' ? result.nodes.at(-1) : undefined
  if (!walked) {
    throw new Error(`Cannot resolve ${anchor.kind} ${anchor.text}`)
  }
  return {path, array: walked.siblings, index: walked.index}
}

function assertNodeArray(
  value: unknown,
  path: string,
  schema: Schema,
  rootSchema: Schema,
) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected a node array at ${path}`)
  }
  for (const [index, node] of value.entries()) {
    const nodePath = `${path}[${index}]`
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      throw new Error(`Non-object entry at ${nodePath}: ${safeStringify(node)}`)
    }
    if (!isTypedObject(node)) {
      continue
    }
    if (node['_type'] === schema.block.name) {
      assertNodeArray(
        node['children'],
        `${nodePath}.children`,
        schema,
        rootSchema,
      )
      assertNodeArray(
        node['markDefs'] ?? [],
        `${nodePath}.markDefs`,
        schema,
        rootSchema,
      )
    }
    const definition = [
      ...schema.blockObjects,
      ...schema.inlineObjects,
      ...schema.annotations,
      ...(schema.block.fields ? [schema.block] : []),
    ].find((type) => type.name === node['_type'])
    for (const field of definition?.fields ?? []) {
      if (
        field.type !== 'array' ||
        !field.of?.some(
          (member) => !['string', 'number', 'boolean'].includes(member.type),
        )
      ) {
        continue
      }
      assertNodeArray(
        node[field.name],
        `${nodePath}.${field.name}`,
        getSubSchema(rootSchema, field.of),
        rootSchema,
      )
    }
  }
}
