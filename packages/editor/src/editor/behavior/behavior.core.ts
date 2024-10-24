import {isHotkey} from 'is-hotkey-esm'
import {defineBehavior} from './behavior.types'
import {getFocusBlockObject} from './behavior.utils'

const overwriteSoftReturn = defineBehavior({
  on: 'key down',
  guard: ({event}) => isHotkey('shift+enter', event.nativeEvent),
  actions: [
    ({event}) => {
      event.nativeEvent.preventDefault()
      return {type: 'insert text', text: '\n'}
    },
  ],
})

const enterOnVoidBlock = defineBehavior({
  on: 'key down',
  guard: ({context, event}) => {
    const isEnter = isHotkey('enter', event.nativeEvent)

    if (!isEnter) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(context)

    return !!focusBlockObject
  },
  actions: [
    ({event}) => {
      event.nativeEvent.preventDefault()
      return {type: 'insert text block', decorators: []}
    },
  ],
})

export const coreBehaviors = [overwriteSoftReturn, enterOnVoidBlock]
