import type {Editor} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {fromCallback, type AnyEventObject} from 'xstate'

export type AvailabilityListenerEvent =
  | {type: 'available'}
  | {type: 'unavailable'}

export const decoratorAvailabilityListener = fromCallback<
  AnyEventObject,
  {editor: Editor; decoratorName: string},
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
    if (
      styleType?.decorators &&
      !styleType.decorators.some((d) => d.name === input.decoratorName)
    ) {
      sendBack({type: 'unavailable'})
    } else {
      sendBack({type: 'available'})
    }
  }

  check()
  return input.editor.on('*', check).unsubscribe
})

export const annotationAvailabilityListener = fromCallback<
  AnyEventObject,
  {editor: Editor; annotationName: string},
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
    if (
      styleType?.annotations &&
      !styleType.annotations.some((a) => a.name === input.annotationName)
    ) {
      sendBack({type: 'unavailable'})
    } else {
      sendBack({type: 'available'})
    }
  }

  check()
  return input.editor.on('*', check).unsubscribe
})

export const listAvailabilityListener = fromCallback<
  AnyEventObject,
  {editor: Editor; listName: string},
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
    if (
      styleType?.lists &&
      !styleType.lists.some((l) => l.name === input.listName)
    ) {
      sendBack({type: 'unavailable'})
    } else {
      sendBack({type: 'available'})
    }
  }

  check()
  return input.editor.on('*', check).unsubscribe
})

export const inlineObjectAvailabilityListener = fromCallback<
  AnyEventObject,
  {editor: Editor; inlineObjectName: string},
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
    if (
      styleType?.inlineObjects &&
      !styleType.inlineObjects.some((io) => io.name === input.inlineObjectName)
    ) {
      sendBack({type: 'unavailable'})
    } else {
      sendBack({type: 'available'})
    }
  }

  check()
  return input.editor.on('*', check).unsubscribe
})
