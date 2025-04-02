import {isEqual} from 'lodash'
import {
  Path,
  Range,
  type BaseRange,
  type NodeEntry,
  type Operation,
} from 'slate'
import {
  and,
  assertEvent,
  assign,
  fromCallback,
  setup,
  type ActorRefFrom,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import type {EditorSchema} from '..'
import {moveRangeByOperation, toSlateRange} from '../internal-utils/ranges'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {PortableTextSlateEditor, RangeDecoration} from '../types/editor'

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

type DecoratedRange = BaseRange & {rangeDecoration: RangeDecoration}

export const rangeDecorationsMachine = setup({
  types: {
    context: {} as {
      decoratedRanges: Array<DecoratedRange>
      pendingRangeDecorations: Array<RangeDecoration>
      readOnly: boolean
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
      updateCount: number
    },
    input: {} as {
      rangeDecorations: Array<RangeDecoration>
      readOnly: boolean
      schema: EditorSchema
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
      pendingRangeDecorations: ({event}) => {
        assertEvent(event, 'range decorations updated')

        return event.rangeDecorations
      },
    }),
    'set up initial range decorations': assign({
      decoratedRanges: ({context, event}) => {
        assertEvent(event, 'ready')

        const rangeDecorationState: Array<DecoratedRange> = []

        for (const rangeDecoration of context.pendingRangeDecorations) {
          const slateRange = toSlateRange(
            rangeDecoration.selection,
            context.slateEditor,
          )

          if (!Range.isRange(slateRange)) {
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

        return rangeDecorationState
      },
    }),
    'update range decorations': assign({
      decoratedRanges: ({context, event}) => {
        assertEvent(event, 'range decorations updated')

        const rangeDecorationState: Array<DecoratedRange> = []

        for (const rangeDecoration of event.rangeDecorations) {
          const slateRange = toSlateRange(
            rangeDecoration.selection,
            context.slateEditor,
          )

          if (!Range.isRange(slateRange)) {
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

        return rangeDecorationState
      },
    }),
    'move range decorations': assign({
      decoratedRanges: ({context, event}) => {
        assertEvent(event, 'slate operation')

        const rangeDecorationState: Array<DecoratedRange> = []

        for (const decoratedRange of context.decoratedRanges) {
          const slateRange = toSlateRange(
            decoratedRange.rangeDecoration.selection,
            context.slateEditor,
          )

          if (!Range.isRange(slateRange)) {
            decoratedRange.rangeDecoration.onMoved?.({
              newSelection: null,
              rangeDecoration: decoratedRange.rangeDecoration,
              origin: 'local',
            })
            continue
          }

          let newRange: BaseRange | null | undefined

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

        return rangeDecorationState
      },
    }),
    'assign readOnly': assign({
      readOnly: ({event}) => {
        assertEvent(event, 'update read only')
        return event.readOnly
      },
    }),
    'increment update count': assign({
      updateCount: ({context}) => {
        return context.updateCount + 1
      },
    }),
  },
  actors: {
    'slate operation listener': fromCallback(slateOperationCallback),
  },
  guards: {
    'has range decorations': ({context}) => context.decoratedRanges.length > 0,
    'has different decorations': ({context, event}) => {
      assertEvent(event, 'range decorations updated')

      const existingRangeDecorations = context.decoratedRanges.map(
        (decoratedRange) => ({
          anchor: decoratedRange.rangeDecoration.selection?.anchor,
          focus: decoratedRange.rangeDecoration.selection?.focus,
        }),
      )

      const newRangeDecorations = event.rangeDecorations.map(
        (rangeDecoration) => ({
          anchor: rangeDecoration.selection?.anchor,
          focus: rangeDecoration.selection?.focus,
        }),
      )

      const different = !isEqual(existingRangeDecorations, newRangeDecorations)

      return different
    },
    'not read only': ({context}) => !context.readOnly,
  },
}).createMachine({
  id: 'range decorations',
  context: ({input}) => ({
    readOnly: input.readOnly,
    pendingRangeDecorations: input.rangeDecorations,
    decoratedRanges: [],
    schema: input.schema,
    slateEditor: input.slateEditor,
    updateCount: 0,
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
  initial: 'idle',
  states: {
    idle: {
      on: {
        'range decorations updated': {
          actions: ['update pending range decorations'],
        },
        'ready': {
          target: 'ready',
          actions: ['set up initial range decorations'],
        },
      },
    },
    ready: {
      initial: 'idle',
      on: {
        'range decorations updated': {
          target: '.idle',
          guard: 'has different decorations',
          actions: ['update range decorations', 'increment update count'],
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

export function createDecorate(
  rangeDecorationActor: ActorRefFrom<typeof rangeDecorationsMachine>,
) {
  return function decorate([, path]: NodeEntry): Array<BaseRange> {
    if (
      isEqualToEmptyEditor(
        rangeDecorationActor.getSnapshot().context.slateEditor.children,
        rangeDecorationActor.getSnapshot().context.schema,
      )
    ) {
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
        } as BaseRange,
      ]
    }

    // Editor node has a path length of 0 (should never be decorated)
    if (path.length === 0) {
      return []
    }

    return rangeDecorationActor
      .getSnapshot()
      .context.decoratedRanges.filter((item) => {
        // Special case in order to only return one decoration for collapsed ranges
        if (Range.isCollapsed(item)) {
          // Collapsed ranges should only be decorated if they are on a block child level (length 2)
          if (path.length !== 2) {
            return false
          }

          return (
            Path.equals(item.focus.path, path) &&
            Path.equals(item.anchor.path, path)
          )
        }

        // Include decorations that either include or intersects with this path
        return (
          Range.intersection(item, {
            anchor: {path, offset: 0},
            focus: {path, offset: 0},
          }) || Range.includes(item, path)
        )
      })
  }
}
