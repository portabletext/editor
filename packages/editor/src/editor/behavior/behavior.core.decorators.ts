import {defineBehavior} from './behavior.types'

const decoratorAdd = defineBehavior({
  on: 'decorator.add',
  actions: [
    ({event}) => [
      event,
      {
        type: 'reselect',
      },
    ],
  ],
})

const decoratorRemove = defineBehavior({
  on: 'decorator.remove',
  guard: ({event}) => ({decorator: event.decorator}),
  actions: [
    ({event}) => [
      event,
      {
        type: 'reselect',
      },
    ],
  ],
})

const decoratorToggle = defineBehavior({
  on: 'decorator.toggle',
  guard: ({event}) => ({decorator: event.decorator}),
  actions: [
    ({event}) => [
      event,
      {
        type: 'reselect',
      },
    ],
  ],
})

export const coreDecoratorBehaviors = {
  decoratorAdd,
  decoratorRemove,
  decoratorToggle,
}
