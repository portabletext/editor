import {coreBlockObjectBehaviors} from './behavior.core.block-objects'
import {coreListBehaviors} from './behavior.core.lists'
import {defineBehavior} from './behavior.types'

const softReturn = defineBehavior({
  on: 'insert soft break',
  actions: [() => [{type: 'insert text', text: '\n'}]],
})

export const coreBehaviors = [
  softReturn,
  ...coreBlockObjectBehaviors,
  ...coreListBehaviors,
]
