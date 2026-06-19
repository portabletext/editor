import type {Editor} from '@portabletext/editor'
import {fromCallback, type AnyEventObject} from 'xstate'
import {subscribeToEditorChange} from './subscribe-to-editor-change'

export type DisableListenerEvent = {type: 'enable'} | {type: 'disable'}

export const disableListener = fromCallback<
  AnyEventObject,
  {editor: Editor},
  DisableListenerEvent
>(({input, sendBack}) => {
  // Send back the initial state
  if (input.editor.getSnapshot().context.readOnly) {
    sendBack({type: 'disable'})
  } else {
    sendBack({type: 'enable'})
  }

  return subscribeToEditorChange(input.editor, () => {
    if (input.editor.getSnapshot().context.readOnly) {
      sendBack({type: 'disable'})
    } else {
      sendBack({type: 'enable'})
    }
  })
})
