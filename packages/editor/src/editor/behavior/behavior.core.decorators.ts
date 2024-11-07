import {defineBehavior} from './behavior.types'

const decoratorAdd = defineBehavior({
  on: 'decorator.add',
  actions: [
    ({event}) => [
      {
        type: 'decorator.add',
        decorator: event.decorator,
      },
      {
        type: 'reselect',
      },
    ],
  ],
})

const decoratorRemove = defineBehavior({
  on: 'decorator.remove',
  actions: [
    ({event}) => [
      {
        type: 'decorator.remove',
        decorator: event.decorator,
      },
      {
        type: 'reselect',
      },
    ],
  ],
})

const decoratorToggle = defineBehavior({
  on: 'decorator.toggle',
  actions: [
    ({event}) => [
      {
        type: 'decorator.toggle',
        decorator: event.decorator,
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
