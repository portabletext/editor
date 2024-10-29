import {defineBehavior} from './behavior.types'
import {getFocusBlockObject} from './behavior.utils'

const softReturn = defineBehavior({
  on: 'insert soft break',
  actions: [() => [{type: 'insert text', text: '\n'}]],
})

const breakingVoidBlock = defineBehavior({
  on: 'insert break',
  guard: ({context}) => {
    const focusBlockObject = getFocusBlockObject(context)

    return !!focusBlockObject
  },
  actions: [() => [{type: 'insert text block', decorators: []}]],
})

export const coreBehaviors = [softReturn, breakingVoidBlock]
