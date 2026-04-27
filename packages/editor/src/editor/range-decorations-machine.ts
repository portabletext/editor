import {isTextBlock} from '@portabletext/schema'
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
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import type {Node, NodeEntry} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import type {Range} from '../slate/interfaces/range'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {rangeIncludes} from '../slate/range/range-includes'
import {rangeIntersection} from '../slate/range/range-intersection'
import type {RangeDecoration} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isEmptyTextBlock} from '../utils'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorSchema} from './editor-schema'

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
        if (!rangeDecoration.selection) {
          rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...rangeDecoration.selection,
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
        if (!rangeDecoration.selection) {
          rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...rangeDecoration.selection,
        })
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },

    'move range decorations': ({context, event}) => {
      if (event.type !== 'slate operation') {
        return
      }

      const rangeDecorationState: Array<DecoratedRange> = []

      for (const decoratedRange of context.slateEditor.decoratedRanges) {
        const currentSelection = decoratedRange.rangeDecoration.selection

        if (!currentSelection) {
          decoratedRange.rangeDecoration.onMoved?.({
            newSelection: null,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
          })
          continue
        }

        const newRange = moveRangeByOperation(currentSelection, event.operation)

        if (
          (newRange && newRange !== currentSelection) ||
          (newRange === null && currentSelection)
        ) {
          decoratedRange.rangeDecoration.onMoved?.({
            newSelection: newRange,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
          })
        }

        if (newRange !== null) {
          rangeDecorationState.push({
            ...(newRange || currentSelection),
            rangeDecoration: {
              ...decoratedRange.rangeDecoration,
              selection: newRange || currentSelection,
            },
          })
        }
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
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
      context.slateEditor.decoratedRanges.length > 0,
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

    return slateEditor.decoratedRanges.filter((decoratedRange) => {
      // Special case in order to only return one decoration for collapsed ranges
      if (isCollapsedRange(decoratedRange)) {
        // Collapsed ranges should only be decorated if they are on a block child level.
        const anchorBlock = getEnclosingBlock(
          slateEditor,
          decoratedRange.anchor.path,
        )
        const anchorChildSegment = decoratedRange.anchor.path.at(-1)

        if (!anchorBlock || !isKeyedSegment(anchorChildSegment)) {
          return false
        }

        return (
          anchorBlock.node._key === node._key &&
          node.children.some(
            (child: Node) => child._key === anchorChildSegment._key,
          )
        )
      }

      return (
        rangeIntersection(
          decoratedRange,
          {
            anchor: {path, offset: 0},
            focus: {path, offset: 0},
          },
          slateEditor,
        ) || rangeIncludes(decoratedRange, path, slateEditor)
      )
    })
  }
}
