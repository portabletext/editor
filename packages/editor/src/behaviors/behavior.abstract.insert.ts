import {getFocusTextBlock, getLastBlock} from '../selectors'
import {
  getBlockEndPoint,
  getBlockStartPoint,
  isEmptyTextBlock,
  isEqualSelectionPoints,
} from '../utils'
import {sliceTextBlock} from '../utils/util.slice-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractInsertBehaviors = [
  defineBehavior({
    on: 'insert.blocks',
    guard: ({event}) => {
      const onlyBlock =
        event.blocks.length === 1 ? event.blocks.at(0) : undefined

      if (!onlyBlock) {
        return false
      }

      return {onlyBlock}
    },
    actions: [
      ({event}, {onlyBlock}) => [
        raise({
          type: 'insert.block',
          block: onlyBlock,
          placement: event.placement,
          select: event.select ?? 'end',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'before') {
        return false
      }

      const firstBlockKey =
        event.blocks.at(0)?._key ?? snapshot.context.keyGenerator()
      const lastBlockKey =
        event.blocks.at(-1)?._key ?? snapshot.context.keyGenerator()

      return {firstBlockKey, lastBlockKey}
    },
    actions: [
      ({snapshot, event}, {firstBlockKey, lastBlockKey}) => [
        ...event.blocks.map((block, index) =>
          raise({
            type: 'insert.block',
            block,
            placement: index === 0 ? 'before' : 'after',
            select: index !== event.blocks.length - 1 ? 'end' : 'none',
          }),
        ),
        ...(event.select === 'none'
          ? [
              raise({
                type: 'select',
                at: snapshot.context.selection,
              }),
            ]
          : event.select === 'start'
            ? [
                raise({
                  type: 'select.block',
                  at: [{_key: firstBlockKey}],
                  select: 'start',
                }),
              ]
            : [
                raise({
                  type: 'select.block',
                  at: [{_key: lastBlockKey}],
                  select: 'end',
                }),
              ]),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'after') {
        return false
      }

      const firstBlockKey =
        event.blocks.at(0)?._key ?? snapshot.context.keyGenerator()
      const lastBlockKey =
        event.blocks.at(-1)?._key ?? snapshot.context.keyGenerator()

      return {firstBlockKey, lastBlockKey}
    },
    actions: [
      ({snapshot, event}, {firstBlockKey, lastBlockKey}) => [
        ...event.blocks.map((block, index) =>
          raise({
            type: 'insert.block',
            block,
            placement: 'after',
            select: index !== event.blocks.length - 1 ? 'end' : 'none',
          }),
        ),
        ...(event.select === 'none'
          ? [
              raise({
                type: 'select',
                at: snapshot.context.selection,
              }),
            ]
          : event.select === 'start'
            ? [
                raise({
                  type: 'select.block',
                  at: [{_key: firstBlockKey}],
                  select: 'start',
                }),
              ]
            : [
                raise({
                  type: 'select.block',
                  at: [{_key: lastBlockKey}],
                  select: 'end',
                }),
              ]),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'auto') {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
        return false
      }

      const firstBlockKey =
        event.blocks.at(0)?._key ?? snapshot.context.keyGenerator()
      const lastBlockKey =
        event.blocks.at(-1)?._key ?? snapshot.context.keyGenerator()

      return {focusTextBlock, firstBlockKey, lastBlockKey}
    },
    actions: [
      ({event}, {firstBlockKey, lastBlockKey}) => [
        ...event.blocks.map((block, index) =>
          raise({
            type: 'insert.block',
            block,
            placement: index === 0 ? 'auto' : 'after',
            select: index !== event.blocks.length - 1 ? 'end' : 'none',
          }),
        ),
        ...(event.select === 'none' || event.select === 'start'
          ? [
              raise({
                type: 'select.block',
                at: [{_key: firstBlockKey}],
                select: 'start',
              }),
            ]
          : [
              raise({
                type: 'select.block',
                at: [{_key: lastBlockKey}],
                select: 'end',
              }),
            ]),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'auto') {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock || !snapshot.context.selection) {
        return false
      }

      const focusBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      const focusBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      const focusTextBlockAfter = sliceTextBlock({
        context: {
          schema: snapshot.context.schema,
          selection: {
            anchor: snapshot.context.selection.focus,
            focus: focusBlockEndPoint,
          },
        },
        block: focusTextBlock.node,
      })
      const firstBlockKey =
        event.blocks.at(0)?._key ?? snapshot.context.keyGenerator()

      return {
        firstBlockKey,
        focusBlockStartPoint,
        focusBlockEndPoint,
        focusTextBlockAfter,
        selection: snapshot.context.selection,
      }
    },
    actions: [
      (
        {event},
        {
          focusBlockEndPoint,
          focusTextBlockAfter,
          selection,
          firstBlockKey,
          focusBlockStartPoint,
        },
      ) => [
        ...event.blocks.flatMap((block, index) =>
          index === 0
            ? [
                ...(isEqualSelectionPoints(selection.focus, focusBlockEndPoint)
                  ? []
                  : [
                      raise({
                        type: 'delete',
                        at: {
                          anchor: selection.focus,
                          focus: focusBlockEndPoint,
                        },
                      }),
                    ]),
                raise({
                  type: 'insert.block',
                  block,
                  placement: 'auto',
                  select: 'end',
                }),
              ]
            : index === event.blocks.length - 1
              ? [
                  raise({
                    type: 'insert.block',
                    block,
                    placement: 'after',
                    select: 'end',
                  }),
                  raise({
                    type: 'insert.block',
                    block: focusTextBlockAfter,
                    placement: 'auto',
                    select: event.select === 'end' ? 'none' : 'end',
                  }),
                ]
              : [
                  raise({
                    type: 'insert.block',
                    block,
                    placement: 'after',
                    select: 'end',
                  }),
                ],
        ),
        ...(event.select === 'none'
          ? [
              raise({
                type: 'select',
                at: selection,
              }),
            ]
          : event.select === 'start'
            ? [
                isEqualSelectionPoints(selection.focus, focusBlockStartPoint)
                  ? raise({
                      type: 'select.block',
                      at: [{_key: firstBlockKey}],
                      select: 'start',
                    })
                  : raise({
                      type: 'select',
                      at: {
                        anchor: selection.focus,
                        focus: selection.focus,
                      },
                    }),
              ]
            : []),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({event}) => event.placement === 'auto',
    actions: [
      ({event}) =>
        event.blocks.map((block, index) =>
          raise({
            type: 'insert.block',
            block,
            placement: index === 0 ? 'auto' : 'after',
            select: event.select ?? 'end',
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'insert.break',
    actions: [() => [raise({type: 'split'})]],
  }),
  defineBehavior({
    on: 'insert.child',
    guard: ({snapshot}) => {
      const lastBlock = getLastBlock(snapshot)

      if (!lastBlock) {
        return false
      }

      if (snapshot.context.selection) {
        return false
      }

      const lastBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: lastBlock,
      })

      return {lastBlockEndPoint}
    },
    actions: [
      ({event}, {lastBlockEndPoint}) => [
        raise({
          type: 'select',
          at: {
            anchor: lastBlockEndPoint,
            focus: lastBlockEndPoint,
          },
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.child',
    guard: ({snapshot}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      return snapshot.context.selection && !focusTextBlock
    },
    actions: [
      ({snapshot, event}) => [
        raise({
          type: 'insert.block',
          block: {
            _type: snapshot.context.schema.block.name,
            children: [
              {
                _type: snapshot.context.schema.span.name,
                text: '',
                marks: [],
              },
            ],
          },
          placement: 'auto',
          select: 'end',
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.inline object',
    actions: [
      ({event}) => [
        raise({
          type: 'insert.child',
          child: {
            _type: event.inlineObject.name,
            ...event.inlineObject.value,
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.soft break',
    actions: [() => [raise({type: 'insert.text', text: '\n'})]],
  }),
  defineBehavior({
    on: 'insert.span',
    guard: ({snapshot}) => !getFocusTextBlock(snapshot),
    actions: [
      ({snapshot, event}) => [
        raise({
          type: 'insert.block',
          block: {
            _type: snapshot.context.schema.block.name,
            children: [
              {
                _type: snapshot.context.schema.span.name,
                text: '',
                marks: [],
              },
            ],
          },
          placement: 'auto',
          select: 'end',
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.span',
    guard: ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)
      const markDefs =
        event.annotations?.map((annotation) => ({
          _type: annotation.name,
          _key: snapshot.context.keyGenerator(),
          ...annotation.value,
        })) ?? []

      return {markDefs, focusTextBlock}
    },
    actions: [
      ({snapshot, event}, {markDefs, focusTextBlock}) => [
        ...(focusTextBlock
          ? [
              raise({
                type: 'block.set',
                at: focusTextBlock.path,
                props: {
                  markDefs: [
                    ...(focusTextBlock.node.markDefs ?? []),
                    ...markDefs,
                  ],
                },
              }),
            ]
          : []),
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: event.text,
            marks: [
              ...(event.decorators ?? []),
              ...markDefs.map((markDef) => markDef._key),
            ],
          },
        }),
      ],
    ],
  }),
]
