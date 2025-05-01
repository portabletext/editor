import {defineBehavior, execute, raise} from '../behaviors'
import * as selectors from '../selectors'
import * as utils from '../utils'
import {BehaviorPlugin} from './plugin.behavior'

const oneLineBehaviors = [
  /**
   * Hitting Enter on an expanded selection should just delete that selection
   * without causing a line break.
   */
  defineBehavior({
    on: 'insert.break',
    guard: ({snapshot}) =>
      snapshot.context.selection && selectors.isSelectionExpanded(snapshot)
        ? {selection: snapshot.context.selection}
        : false,
    actions: [(_, {selection}) => [execute({type: 'delete', at: selection})]],
  }),
  /**
   * All other cases of `insert.break` should be aborted.
   */
  defineBehavior({
    on: 'insert.break',
    actions: [],
  }),
  /**
   * `insert.block` `before` or `after` is not allowed in a one-line editor.
   */
  defineBehavior({
    on: 'insert.block',
    guard: ({event}) =>
      event.placement === 'before' || event.placement === 'after',
    actions: [],
  }),
  /**
   * An ordinary `insert.block` is acceptable if it's a text block. In that
   * case it will get merged into the existing text block.
   */
  defineBehavior({
    on: 'insert.block',
    guard: ({snapshot, event}) => {
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (
        !focusTextBlock ||
        !utils.isTextBlock(snapshot.context, event.block)
      ) {
        return false
      }

      return true
    },
    actions: [
      ({event}) => [
        execute({
          type: 'insert.block',
          block: event.block,
          placement: 'auto',
          select: 'end',
        }),
      ],
    ],
  }),
  /**
   * Fallback Behavior to avoid `insert.block` in case the Behaviors above all
   * end up with a falsy guard.
   */
  defineBehavior({
    on: 'insert.block',
    actions: [],
  }),
  /**
   * If multiple blocks are inserted, then the non-text blocks are filtered out
   * and the text blocks are merged into one block
   */
  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      const textBlocks = event.blocks.filter((block) =>
        utils.isTextBlock(snapshot.context, block),
      )

      if (textBlocks.length === 0) {
        return false
      }

      return textBlocks.reduce((targetBlock, incomingBlock) => {
        return utils.mergeTextBlocks({
          context: snapshot.context,
          targetBlock,
          incomingBlock,
        })
      })
    },
    actions: [
      // `insert.block` is raised so the Behavior above can handle the
      // insertion
      (_, block) => [raise({type: 'insert.block', block, placement: 'auto'})],
    ],
  }),
  /**
   * Fallback Behavior to avoid `insert.blocks` in case the Behavior above
   * ends up with a falsy guard.
   */
  defineBehavior({
    on: 'insert.blocks',
    actions: [],
  }),
]

/**
 * @beta
 * Restrict the editor to one line. The plugin takes care of blocking
 * `insert.break` events and smart handling of other `insert.*` events.
 *
 * Place it with as high priority as possible to make sure other plugins don't
 * overwrite `insert.*` events before this plugin gets a chance to do so.
 *
 * @deprecated Install the plugin from `@portabletext/plugin-one-line`
 */
export function OneLinePlugin() {
  return <BehaviorPlugin behaviors={oneLineBehaviors} />
}
