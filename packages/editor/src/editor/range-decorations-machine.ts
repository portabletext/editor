import {isSpan, isTextBlock} from '@portabletext/schema'
import {
  and,
  assign,
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {isDeepEqual} from '../internal-utils/equality'
import {moveRangeByOperation} from '../internal-utils/move-range-by-operation'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {Node, NodeEntry} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import type {Range} from '../slate/interfaces/range'
import {pathEquals} from '../slate/path/path-equals'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isRange} from '../slate/range/is-range'
import {rangeIncludes} from '../slate/range/range-includes'
import {rangeIntersection} from '../slate/range/range-intersection'
import type {RangeDecoration} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isEmptyTextBlock} from '../utils'
import type {EditorSchema} from './editor-schema'

type DisplacedDecoration = {
  decoratedRange: DecoratedRange
  removedText: string
  relativeAnchorOffset: number
  relativeFocusOffset: number
  reattached?: boolean
}

const displacedDecorationsMap = new WeakMap<
  PortableTextSlateEditor,
  Array<DisplacedDecoration>
>()

const slateOperationCallback: CallbackLogicFunction<
  AnyEventObject,
  {type: 'slate operation'; operation: Operation},
  {slateEditor: PortableTextSlateEditor}
> = ({input, sendBack}) => {
  const originalApply = input.slateEditor.apply

  input.slateEditor.apply = (op) => {
    if (op.type !== 'set_selection') {
      sendBack({type: 'slate operation', operation: op})
    }

    originalApply(op)
  }

  return () => {
    input.slateEditor.apply = originalApply
  }
}

export type DecoratedRange = Range & {rangeDecoration: RangeDecoration}

export const rangeDecorationsMachine = setup({
  types: {
    context: {} as {
      pendingRangeDecorations: Array<RangeDecoration>
      skipSetup: boolean
      readOnly: boolean
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
      decorate: {fn: (nodeEntry: NodeEntry) => Array<Range>}
    },
    input: {} as {
      rangeDecorations: Array<RangeDecoration>
      readOnly: boolean
      schema: EditorSchema
      skipSetup: boolean
      slateEditor: PortableTextSlateEditor
    },
    events: {} as
      | {
          type: 'ready'
        }
      | {
          type: 'range decorations updated'
          rangeDecorations: Array<RangeDecoration>
        }
      | {
          type: 'slate operation'
          operation: Operation
        }
      | {
          type: 'update read only'
          readOnly: boolean
        },
  },
  actions: {
    'update pending range decorations': assign({
      pendingRangeDecorations: ({context, event}) => {
        if (event.type !== 'range decorations updated') {
          return context.pendingRangeDecorations
        }

        return event.rangeDecorations
      },
    }),
    'set up initial range decorations': ({context}) => {
      const rangeDecorationState: Array<DecoratedRange> = []

      for (const rangeDecoration of context.pendingRangeDecorations) {
        const slateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.children,
            selection: rangeDecoration.selection,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!isRange(slateRange)) {
          rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...slateRange,
        })
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },
    'update range decorations': ({context, event}) => {
      if (event.type !== 'range decorations updated') {
        return
      }

      const rangeDecorationState: Array<DecoratedRange> = []

      for (const rangeDecoration of event.rangeDecorations) {
        const slateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.children,
            selection: rangeDecoration.selection,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!isRange(slateRange)) {
          rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...slateRange,
        })
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },

    'move range decorations': ({context, event}) => {
      if (event.type !== 'slate operation') {
        return
      }

      const rangeDecorationState: Array<DecoratedRange> = []

      // Try to re-attach displaced decorations when new content is inserted
      if (event.operation.type === 'insert_node') {
        const displaced = displacedDecorationsMap.get(context.slateEditor) ?? []

        if (displaced.length > 0) {
          const insertedNode = event.operation.node
          const insertPath = event.operation.path

          reattachDisplacedDecorations({
            displaced,
            insertedNode,
            insertPath,
            schema: context.schema,
            rangeDecorationState,
          })

          displacedDecorationsMap.set(
            context.slateEditor,
            displaced.filter((d) => !d.reattached),
          )
        }
      }

      for (const decoratedRange of context.slateEditor.decoratedRanges) {
        const slateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.children,
            selection: decoratedRange.rangeDecoration.selection,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!isRange(slateRange)) {
          decoratedRange.rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
          })
          continue
        }

        // Check if remove_text would displace this decoration
        if (
          event.operation.type === 'remove_text' &&
          !isCollapsedRange(slateRange)
        ) {
          const displaced = checkDisplacement(slateRange, event.operation)

          if (displaced) {
            const existing =
              displacedDecorationsMap.get(context.slateEditor) ?? []
            existing.push({
              decoratedRange,
              removedText: event.operation.text,
              relativeAnchorOffset: displaced.relativeAnchorOffset,
              relativeFocusOffset: displaced.relativeFocusOffset,
            })
            displacedDecorationsMap.set(context.slateEditor, existing)
            continue
          }
        }

        let newRange: Range | null | undefined

        newRange = moveRangeByOperation(slateRange, event.operation)
        if (
          (newRange && newRange !== slateRange) ||
          (newRange === null && slateRange)
        ) {
          const newRangeSelection = newRange
            ? slateRangeToSelection({
                schema: context.schema,
                editor: context.slateEditor,
                range: newRange,
              })
            : null

          decoratedRange.rangeDecoration.onMoved?.({
            newSelection: newRangeSelection,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
          })
        }

        // If the newRange is null, it means that the range is not valid anymore and should be removed
        // If it's undefined, it means that the slateRange is still valid and should be kept
        if (newRange !== null) {
          rangeDecorationState.push({
            ...(newRange || slateRange),
            rangeDecoration: {
              ...decoratedRange.rangeDecoration,
              selection: slateRangeToSelection({
                schema: context.schema,
                editor: context.slateEditor,
                range: newRange,
              }),
            },
          })
        }
      }

      context.slateEditor.decoratedRanges = rangeDecorationState

      // Clean up any displaced decorations that weren't re-attached after
      // a non-remove_text operation (the insert that would re-attach them
      // has already been processed or won't come)
      if (
        event.operation.type !== 'remove_text' &&
        event.operation.type !== 'insert_node'
      ) {
        const remaining = displacedDecorationsMap.get(context.slateEditor) ?? []

        for (const d of remaining) {
          d.decoratedRange.rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration: d.decoratedRange.rangeDecoration,
            origin: 'local',
          })
        }

        displacedDecorationsMap.delete(context.slateEditor)
      }
    },
    'assign readOnly': assign({
      readOnly: ({context, event}) => {
        if (event.type !== 'update read only') {
          return context.readOnly
        }

        return event.readOnly
      },
    }),
    'update decorate': assign({
      decorate: ({context}) => {
        return {
          fn: createDecorate(context.schema, context.slateEditor),
        }
      },
    }),
  },
  actors: {
    'slate operation listener': fromCallback(slateOperationCallback),
  },
  guards: {
    'has pending range decorations': ({context}) =>
      context.pendingRangeDecorations.length > 0,
    'has range decorations': ({context}) =>
      context.slateEditor.decoratedRanges.length > 0 ||
      (displacedDecorationsMap.get(context.slateEditor) ?? []).length > 0,
    'has different decorations': ({context, event}) => {
      if (event.type !== 'range decorations updated') {
        return false
      }

      const existingRangeDecorations = context.slateEditor.decoratedRanges.map(
        (decoratedRange) => ({
          anchor: decoratedRange.rangeDecoration.selection?.anchor,
          focus: decoratedRange.rangeDecoration.selection?.focus,
          payload: decoratedRange.rangeDecoration.payload,
        }),
      )

      const newRangeDecorations = event.rangeDecorations.map(
        (rangeDecoration) => ({
          anchor: rangeDecoration.selection?.anchor,
          focus: rangeDecoration.selection?.focus,
          payload: rangeDecoration.payload,
        }),
      )

      const different = !isDeepEqual(
        existingRangeDecorations,
        newRangeDecorations,
      )

      return different
    },
    'not read only': ({context}) => !context.readOnly,
    'should skip setup': ({context}) => context.skipSetup,
  },
}).createMachine({
  id: 'range decorations',
  context: ({input}) => ({
    readOnly: input.readOnly,
    pendingRangeDecorations: input.rangeDecorations,
    decoratedRanges: [],
    skipSetup: input.skipSetup,
    schema: input.schema,
    slateEditor: input.slateEditor,
    decorate: {
      fn: createDecorate(input.schema, input.slateEditor),
    },
  }),
  invoke: {
    src: 'slate operation listener',
    input: ({context}) => ({slateEditor: context.slateEditor}),
  },
  on: {
    'update read only': {
      actions: ['assign readOnly'],
    },
  },
  initial: 'setting up',
  states: {
    'setting up': {
      always: [
        {
          guard: and(['should skip setup', 'has pending range decorations']),
          target: 'ready',
          actions: ['set up initial range decorations', 'update decorate'],
        },
        {
          guard: 'should skip setup',
          target: 'ready',
        },
      ],
      on: {
        'range decorations updated': {
          actions: ['update pending range decorations'],
        },
        'ready': [
          {
            target: 'ready',
            guard: 'has pending range decorations',
            actions: ['set up initial range decorations', 'update decorate'],
          },
          {
            target: 'ready',
          },
        ],
      },
    },
    'ready': {
      initial: 'idle',
      on: {
        'range decorations updated': {
          target: '.idle',
          guard: 'has different decorations',
          actions: ['update range decorations', 'update decorate'],
        },
      },
      states: {
        'idle': {
          on: {
            'slate operation': {
              target: 'moving range decorations',
              guard: and(['has range decorations', 'not read only']),
            },
          },
        },
        'moving range decorations': {
          entry: ['move range decorations'],
          always: {
            target: 'idle',
          },
        },
      },
    },
  },
})

/**
 * Check if a remove_text operation would displace a non-collapsed decoration.
 *
 * A decoration is displaced when both its anchor and focus fall within the
 * removed text range. Instead of collapsing the decoration (losing the range
 * information), we track the relative offsets so the decoration can be
 * re-attached when the text reappears in an insert_node operation.
 */
function checkDisplacement(
  range: Range,
  op: {type: 'remove_text'; path: number[]; offset: number; text: string},
): {relativeAnchorOffset: number; relativeFocusOffset: number} | undefined {
  const removeStart = op.offset
  const removeEnd = op.offset + op.text.length

  const anchorInRange =
    pathEquals(range.anchor.path, op.path) &&
    range.anchor.offset >= removeStart &&
    range.anchor.offset <= removeEnd
  const focusInRange =
    pathEquals(range.focus.path, op.path) &&
    range.focus.offset >= removeStart &&
    range.focus.offset <= removeEnd

  if (!anchorInRange || !focusInRange) {
    return undefined
  }

  return {
    relativeAnchorOffset: range.anchor.offset - removeStart,
    relativeFocusOffset: range.focus.offset - removeStart,
  }
}

/**
 * Try to re-attach displaced decorations to text content in an inserted node.
 *
 * When a block is split via delete + insert.block, the removed text reappears
 * in the inserted node. This function walks the inserted node's spans looking
 * for text that matches the removed text, and re-attaches the decoration at
 * the correct position.
 */
function reattachDisplacedDecorations({
  displaced,
  insertedNode,
  insertPath,
  schema,
  rangeDecorationState,
}: {
  displaced: Array<DisplacedDecoration>
  insertedNode: Node
  insertPath: number[]
  schema: EditorSchema
  rangeDecorationState: Array<DecoratedRange>
}) {
  if (!isTextBlock({schema}, insertedNode)) {
    return
  }

  for (const d of displaced) {
    let childIndex = 0

    for (const child of insertedNode.children) {
      if (isSpan({schema}, child)) {
        const textIndex = child.text.indexOf(d.removedText)

        if (textIndex !== -1) {
          const anchorOffset = textIndex + d.relativeAnchorOffset
          const focusOffset = textIndex + d.relativeFocusOffset

          if (
            anchorOffset <= child.text.length &&
            focusOffset <= child.text.length
          ) {
            const newRange: Range = {
              anchor: {path: [...insertPath, childIndex], offset: anchorOffset},
              focus: {path: [...insertPath, childIndex], offset: focusOffset},
            }

            // Build the PTE selection directly from the inserted node's keys
            // since the tree may not be updated yet when this runs
            const blockKey = insertedNode._key as string
            const childKey = child._key as string
            const newSelection =
              blockKey && childKey
                ? {
                    anchor: {
                      path: [
                        {_key: blockKey},
                        'children' as const,
                        {_key: childKey},
                      ],
                      offset: anchorOffset,
                    },
                    focus: {
                      path: [
                        {_key: blockKey},
                        'children' as const,
                        {_key: childKey},
                      ],
                      offset: focusOffset,
                    },
                  }
                : null

            d.decoratedRange.rangeDecoration.onMoved?.({
              newSelection,
              rangeDecoration: d.decoratedRange.rangeDecoration,
              origin: 'local',
            })

            rangeDecorationState.push({
              ...newRange,
              rangeDecoration: {
                ...d.decoratedRange.rangeDecoration,
                selection: newSelection,
              },
            })

            d.reattached = true
            break
          }
        }
      }

      childIndex++
    }
  }
}

function createDecorate(
  schema: EditorSchema,
  slateEditor: PortableTextSlateEditor,
) {
  return function decorate([node, path]: NodeEntry): Array<Range> {
    const defaultStyle = schema.styles.at(0)?.name
    const firstBlock = slateEditor.children[0]
    const editorOnlyContainsEmptyParagraph =
      slateEditor.children.length === 1 &&
      firstBlock &&
      isEmptyTextBlock({schema}, firstBlock) &&
      (!firstBlock.style || firstBlock.style === defaultStyle) &&
      !firstBlock.listItem

    if (editorOnlyContainsEmptyParagraph) {
      return [
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 0],
            offset: 0,
          },
          placeholder: true,
        } as Range,
      ]
    }

    // Editor node has a path length of 0 (should never be decorated)
    if (path.length === 0) {
      return []
    }

    if (
      !isTextBlock({schema: slateEditor.schema}, node) ||
      node.children.length === 0
    ) {
      return []
    }

    const blockIndex = path.at(0)

    if (blockIndex === undefined) {
      return []
    }

    return slateEditor.decoratedRanges.filter((decoratedRange) => {
      // Special case in order to only return one decoration for collapsed ranges
      if (isCollapsedRange(decoratedRange)) {
        // Collapsed ranges should only be decorated if they are on a block child level (length 2)
        return node.children.some(
          (_: Node, childIndex: number) =>
            pathEquals(decoratedRange.anchor.path, [blockIndex, childIndex]) &&
            pathEquals(decoratedRange.focus.path, [blockIndex, childIndex]),
        )
      }

      return (
        rangeIntersection(decoratedRange, {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
        }) || rangeIncludes(decoratedRange, path)
      )
    })
  }
}
