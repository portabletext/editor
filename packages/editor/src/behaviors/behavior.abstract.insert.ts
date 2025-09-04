import {getFocusTextBlock} from '../selectors'
import {isEmptyTextBlock} from '../utils'
import {execute, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractInsertBehaviors = [
  defineBehavior({
    on: 'insert.blocks',
    guard: ({event}) => event.placement === 'before',
    actions: [
      ({event}) =>
        event.blocks.map((block, index) =>
          raise({
            type: 'insert.block',
            block,
            placement: index === 0 ? 'before' : 'after',
            select: event.select ?? 'end',
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({event}) => event.placement === 'after',
    actions: [
      ({event}) =>
        event.blocks.map((block) =>
          raise({
            type: 'insert.block',
            block,
            placement: 'after',
            select: event.select ?? 'end',
          }),
        ),
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

      return {focusTextBlock}
    },
    actions: [
      ({snapshot, event}, {focusTextBlock}) =>
        event.blocks.length === 1
          ? [
              raise({
                type: 'insert.block',
                block: event.blocks[0],
                placement: 'auto',
                select: event.select ?? 'end',
              }),
            ]
          : isEmptyTextBlock(snapshot.context, focusTextBlock.node)
            ? event.blocks.map((block, index) =>
                raise({
                  type: 'insert.block',
                  block,
                  placement: index === 0 ? 'auto' : 'after',
                  select: event.select ?? 'end',
                }),
              )
            : event.blocks.flatMap((block, index) =>
                index === 0
                  ? [
                      raise({
                        type: 'split',
                      }),
                      raise({
                        type: 'select.previous block',
                        select: 'end',
                      }),
                      raise({
                        type: 'insert.block',
                        block,
                        placement: 'auto',
                        select: event.select ?? 'end',
                      }),
                    ]
                  : index === event.blocks.length - 1
                    ? [
                        raise({
                          type: 'select.next block',
                          select: 'start',
                        }),
                        raise({
                          type: 'insert.block',
                          block,
                          placement: 'auto',
                          select: event.select ?? 'end',
                        }),
                      ]
                    : [
                        raise({
                          type: 'insert.block',
                          block,
                          placement: 'after',
                          select: event.select ?? 'end',
                        }),
                      ],
              ),
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
    on: 'insert.inline object',
    actions: [
      ({snapshot, event}) => [
        execute({
          type: 'insert.block',
          block: {
            _type: snapshot.context.schema.block.name,
            children: [
              {
                _type: event.inlineObject.name,
                ...event.inlineObject.value,
              },
            ],
          },
          placement: 'auto',
          select: 'end',
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
    guard: ({snapshot, event}) => {
      const markDefs =
        event.annotations?.map((annotation) => ({
          _type: annotation.name,
          _key: snapshot.context.keyGenerator(),
          ...annotation.value,
        })) ?? []

      return {markDefs}
    },
    actions: [
      ({snapshot, event}, {markDefs}) => [
        execute({
          type: 'insert.block',
          block: {
            _type: snapshot.context.schema.block.name,
            children: [
              {
                _type: snapshot.context.schema.span.name,
                text: event.text,
                marks: [
                  ...(event.decorators ?? []),
                  ...markDefs.map((markDef) => markDef._key),
                ],
              },
            ],
            markDefs,
          },
          placement: 'auto',
          select: 'end',
        }),
      ],
    ],
  }),
]
