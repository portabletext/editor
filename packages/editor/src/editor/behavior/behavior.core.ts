import {isHotkey} from 'is-hotkey-esm'
import {defineBehavior} from './behavior'
import {getFocusBlockObject} from './behavior-utils'

const overwriteSoftReturn = defineBehavior({
  on: 'before:native:key down',
  guard: ({event}) => isHotkey('shift+enter', event.event),
  actions: [
    ({event}) => {
      event.event.preventDefault()
      return {type: 'insert text', text: '\n'}
    },
  ],
})

const enterOnVoidBlock = defineBehavior({
  on: 'before:native:key down',
  guard: ({context, event}) => {
    const isEnter = isHotkey('enter', event.event)

    if (!isEnter) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(context)

    if (focusBlockObject) {
      event.event.preventDefault()
      return true
    }

    return false
  },
  actions: [() => ({type: 'insert text block', decorators: []})],
})

export const coreBehaviors = [overwriteSoftReturn, enterOnVoidBlock]
