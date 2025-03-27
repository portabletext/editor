import {getFocusTextBlock} from '../selectors'
import {raise} from './behavior.types.action'
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
            select: 'end',
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
            select: 'end',
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

      return true
    },
    actions: [
      ({event}) =>
        event.blocks.length === 1
          ? [
              raise({
                type: 'insert.block',
                block: event.blocks[0],
                placement: 'auto',
                select: 'end',
              }),
            ]
          : event.blocks.flatMap((block, index) =>
              index === 0
                ? [
                    raise({
                      type: 'insert.break',
                    }),
                    raise({
                      type: 'select.previous block',
                      select: 'end',
                    }),
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
                        type: 'select.next block',
                        select: 'start',
                      }),
                      raise({
                        type: 'insert.block',
                        block,
                        placement: 'auto',
                        select: 'end',
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
            select: 'end',
          }),
        ),
    ],
  }),
]
