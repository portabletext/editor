import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

const toggleStyleOff = defineBehavior({
  on: 'style.toggle',
  guard: ({context, event}) => selectors.isActiveStyle(event.style)({context}),
  actions: [({event}) => [raise({type: 'style.remove', style: event.style})]],
})

const toggleStyleOn = defineBehavior({
  on: 'style.toggle',
  guard: ({context, event}) => !selectors.isActiveStyle(event.style)({context}),
  actions: [({event}) => [raise({type: 'style.add', style: event.style})]],
})

export const coreStyleBehaviors = {
  toggleStyleOff,
  toggleStyleOn,
}
