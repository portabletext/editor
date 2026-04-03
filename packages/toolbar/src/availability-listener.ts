import type {Editor} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {fromCallback, type AnyEventObject} from 'xstate'

export type AvailabilityListenerEvent =
  | {type: 'available'}
  | {type: 'unavailable'}

function createAvailabilityListener(
  feature: 'decorators' | 'annotations' | 'lists' | 'inlineObjects',
) {
  return fromCallback<
    AnyEventObject,
    {editor: Editor; featureName: string},
    AvailabilityListenerEvent
  >(({input, sendBack}) => {
    function check() {
      const snapshot = input.editor.getSnapshot()
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      if (!focusTextBlock) {
        sendBack({type: 'available'})
        return
      }
      const style = focusTextBlock.node.style
      const styleType = style
        ? snapshot.context.schema.styles.find((s) => s.name === style)
        : undefined
      const allowed = styleType?.[feature]
      if (allowed && !allowed.some((item) => item.name === input.featureName)) {
        sendBack({type: 'unavailable'})
      } else {
        sendBack({type: 'available'})
      }
    }

    check()
    return input.editor.on('*', check).unsubscribe
  })
}

export const decoratorAvailabilityListener =
  createAvailabilityListener('decorators')
export const annotationAvailabilityListener =
  createAvailabilityListener('annotations')
export const listAvailabilityListener = createAvailabilityListener('lists')
export const inlineObjectAvailabilityListener =
  createAvailabilityListener('inlineObjects')
