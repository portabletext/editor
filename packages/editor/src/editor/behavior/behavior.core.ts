import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreListBehaviors} from './behavior.core.lists'
import {defineBehavior} from './behavior.types'

const softReturn = defineBehavior({
  on: 'insert soft break',
  actions: [() => [{type: 'insert text', text: '\n'}]],
})

/**
 * @alpha
 */
export const coreBehaviors = [
  softReturn,
  coreBlockObjectBehaviors.breakingBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockAfterBlockObject,
  coreBlockObjectBehaviors.deletingEmptyTextBlockBeforeBlockObject,
  coreListBehaviors.clearListOnBackspace,
  coreListBehaviors.unindentListOnBackspace,
]

/**
 * @alpha
 */
export const coreBehavior = {
  softReturn,
  blockObjects: coreBlockObjectBehaviors,
  lists: coreListBehaviors,
}
