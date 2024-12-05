import {defineBehavior} from './behavior.types'

const decoratorAdd = defineBehavior({
  on: 'decorator.add',
  guard: ({event}) => ({decorator: event.decorator}),
  actions: [
    ({decorator}) => [
      {
        type: 'decorator.add',
        decorator,
      },
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
    ({decorator}) => [
      {
        type: 'decorator.remove',
        decorator,
      },
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
    ({decorator}) => [
      {
        type: 'decorator.toggle',
        decorator,
      },
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
