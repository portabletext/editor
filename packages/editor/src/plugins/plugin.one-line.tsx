import {defineBehavior, raise} from '../behaviors'
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
    actions: [(_, {selection}) => [{type: 'delete', selection}]],
  }),
  /**
   * All other cases of `insert.break` should be aborted.
   */
  defineBehavior({
    on: 'insert.break',
    actions: [() => [{type: 'noop'}]],
  }),
  /**
   * `insert.block` `before` or `after` is not allowed in a one-line editor.
   */
  defineBehavior({
    on: 'insert.block',
    guard: ({event}) =>
      event.placement === 'before' || event.placement === 'after',
    actions: [() => [{type: 'noop'}]],
  }),
  /**
   * Other cases of `insert.block` are allowed.
   *
   * If a text block is inserted and the focus block is fully selected, then
   * the focus block can be replaced with the inserted block.
   */
  defineBehavior({
    on: 'insert.block',
    guard: ({snapshot, event}) => {
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const selectionStartPoint = selectors.getSelectionStartPoint(snapshot)
      const selectionEndPoint = selectors.getSelectionEndPoint(snapshot)

      if (
        !focusTextBlock ||
        !utils.isTextBlock(snapshot.context, event.block) ||
        !selectionStartPoint ||
        !selectionEndPoint
      ) {
        return false
      }

      const blockStartPoint = utils.getBlockStartPoint(focusTextBlock)
      const blockEndPoint = utils.getBlockEndPoint(focusTextBlock)
      const newFocus = utils.getBlockEndPoint({
        node: event.block,
        path: [{_key: event.block._key}],
      })

      if (
        utils.isEqualSelectionPoints(blockStartPoint, selectionStartPoint) &&
        utils.isEqualSelectionPoints(blockEndPoint, selectionEndPoint)
      ) {
        return {focusTextBlock, newFocus}
      }

      return false
    },
    actions: [
      ({event}, {focusTextBlock, newFocus}) => [
        {type: 'delete.block', blockPath: focusTextBlock.path},
        {type: 'insert.block', block: event.block, placement: 'auto'},
        {
          type: 'select',
          selection: {
            anchor: newFocus,
            focus: newFocus,
          },
        },
      ],
    ],
  }),
  /**
   * An ordinary `insert.block` is acceptable if it's a text block. In that
   * case it will get merged into the existing text block.
   */
  defineBehavior({
    on: 'insert.block',
    guard: ({snapshot, event}) => {
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const selectionStartPoint = selectors.getSelectionStartPoint(snapshot)
      const selectionEndPoint = selectors.getSelectionEndPoint(snapshot)

      if (
        !focusTextBlock ||
        !utils.isTextBlock(snapshot.context, event.block) ||
        !selectionStartPoint ||
        !selectionEndPoint
      ) {
        return false
      }

      const blockBeforeStartPoint = utils.splitTextBlock({
        context: snapshot.context,
        block: focusTextBlock.node,
        point: selectionStartPoint,
      })?.before
      const blockAfterEndPoint = utils.splitTextBlock({
        context: snapshot.context,
        block: focusTextBlock.node,
        point: selectionEndPoint,
      })?.after

      if (!blockBeforeStartPoint || !blockAfterEndPoint) {
        return false
      }

      const targetBlock = utils.mergeTextBlocks({
        context: snapshot.context,
        targetBlock: blockBeforeStartPoint,
        incomingBlock: event.block,
      })

      const newFocus = utils.getBlockEndPoint({
        node: targetBlock,
        path: [{_key: targetBlock._key}],
      })

      const mergedBlock = utils.mergeTextBlocks({
        context: snapshot.context,
        targetBlock,
        incomingBlock: blockAfterEndPoint,
      })

      return {focusTextBlock, mergedBlock, newFocus}
    },
    actions: [
      (_, {focusTextBlock, mergedBlock, newFocus}) => [
        {type: 'delete.block', blockPath: focusTextBlock.path},
        {type: 'insert.block', block: mergedBlock, placement: 'auto'},
        {
          type: 'select',
          selection: {
            anchor: newFocus,
            focus: newFocus,
          },
        },
      ],
    ],
  }),
  /**
   * Fallback Behavior to avoid `insert.block` in case the Behaviors above all
   * end up with a falsy guard.
   */
  defineBehavior({
    on: 'insert.block',
    actions: [() => [{type: 'noop'}]],
  }),
  /**
   * If multiple blocks are inserted, then the non-text blocks are filtered out
   * and the text blocks are merged into one block
   */
  defineBehavior({
    on: 'insert.blocks',
    guard: ({context, event}) => {
      return event.blocks
        .filter((block) => utils.isTextBlock(context, block))
        .reduce((targetBlock, incomingBlock) => {
          return utils.mergeTextBlocks({
            context,
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
   * Block objects do not fit in a one-line editor
   */
  defineBehavior({
    on: 'insert.block object',
    actions: [() => [{type: 'noop'}]],
  }),
  /**
   * `insert.text block` is raised as an `insert.block` so it can be handled
   * by the Behaviors above.
   */
  defineBehavior({
    on: 'insert.text block',
    actions: [
      ({context, event}) => [
        raise({
          type: 'insert.block',
          block: {
            _key: context.keyGenerator(),
            _type: context.schema.block.name,
            children: event.textBlock?.children ?? [],
          },
          placement: event.placement,
        }),
      ],
    ],
  }),
]

/**
 * @beta
 * Restrict the editor to one line. The plugin takes care of blocking
 * `insert.break` events and smart handling of other `insert.*` events.
 *
 * Place it with as high priority as possible to make sure other plugins don't
 * overwrite `insert.*` events before this plugin gets a chance to do so.
 */
export function OneLinePlugin() {
  return <BehaviorPlugin behaviors={oneLineBehaviors} />
}
