import {Editor, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {setup} from 'xstate'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/editor'

const debug = debugWithName('validate selection machine')

const validateSelectionSetup = setup({
  types: {
    context: {} as {
      slateEditor: PortableTextSlateEditor
    },
    input: {} as {
      slateEditor: PortableTextSlateEditor
    },
    events: {} as {
      type: 'validate selection'
      editorElement: HTMLDivElement
    },
  },
  guards: {
    'pending operations': ({context}) =>
      context.slateEditor.operations.length > 0,
  },
})

const validateSelectionAction = validateSelectionSetup.createAction(
  ({context, event}) => {
    validateSelection(context.slateEditor, event.editorElement)
  },
)

export const validateSelectionMachine = validateSelectionSetup.createMachine({
  id: 'validate selection',
  context: ({input}) => ({
    slateEditor: input.slateEditor,
  }),
  initial: 'idle',
  states: {
    idle: {
      on: {
        'validate selection': [
          {
            guard: 'pending operations',
            target: 'waiting',
          },
          {
            actions: [validateSelectionAction],
            target: 'idle',
          },
        ],
      },
    },
    waiting: {
      after: {
        0: [
          {
            guard: 'pending operations',
            target: '.',
            reenter: true,
          },
          {
            target: 'idle',
            actions: [validateSelectionAction],
          },
        ],
      },
      on: {
        'validate selection': {
          target: '.',
          reenter: true,
        },
      },
    },
  },
})

// This function will handle unexpected DOM changes inside the Editable rendering,
// and make sure that we can maintain a stable slateEditor.selection when that happens.
//
// For example, if this Editable is rendered inside something that might re-render
// this component (hidden contexts) while the user is still actively changing the
// contentEditable, this could interfere with the intermediate DOM selection,
// which again could be picked up by ReactEditor's event listeners.
// If that range is invalid at that point, the slate.editorSelection could be
// set either wrong, or invalid, to which slateEditor will throw exceptions
// that are impossible to recover properly from or result in a wrong selection.
//
// Also the other way around, when the ReactEditor will try to create a DOM Range
// from the current slateEditor.selection, it may throw unrecoverable errors
// if the current editor.selection is invalid according to the DOM.
// If this is the case, default to selecting the top of the document, if the
// user already had a selection.
function validateSelection(
  slateEditor: PortableTextSlateEditor,
  editorElement: HTMLDivElement,
) {
  if (!slateEditor.selection) {
    return
  }

  let root: Document | ShadowRoot | undefined

  try {
    root = ReactEditor.findDocumentOrShadowRoot(slateEditor)
  } catch {}

  if (!root) {
    // The editor has most likely been unmounted
    return
  }

  // Return if the editor isn't the active element
  if (editorElement !== root.activeElement) {
    return
  }
  const window = ReactEditor.getWindow(slateEditor)
  const domSelection = window.getSelection()
  if (!domSelection || domSelection.rangeCount === 0) {
    return
  }
  const existingDOMRange = domSelection.getRangeAt(0)
  try {
    const newDOMRange = ReactEditor.toDOMRange(
      slateEditor,
      slateEditor.selection,
    )
    if (
      newDOMRange.startOffset !== existingDOMRange.startOffset ||
      newDOMRange.endOffset !== existingDOMRange.endOffset
    ) {
      debug('DOM range out of sync, validating selection')
      // Remove all ranges temporary
      domSelection?.removeAllRanges()
      // Set the correct range
      domSelection.addRange(newDOMRange)
    }
  } catch {
    debug(`Could not resolve selection, selecting top document`)
    // Deselect the editor
    Transforms.deselect(slateEditor)
    // Select top document if there is a top block to select
    if (slateEditor.children.length > 0) {
      Transforms.select(slateEditor, Editor.start(slateEditor, []))
    }
    slateEditor.onChange()
  }
}
