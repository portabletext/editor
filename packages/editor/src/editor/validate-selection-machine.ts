import {setup} from 'xstate'
import {debug} from '../internal-utils/debug'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'

const MAX_RETRIES = 3

const validateSelectionSetup = setup({
  types: {
    context: {} as {
      slateEditor: PortableTextSlateEditor
      retryCount: number
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
  ({context, event, self}) => {
    const result = validateSelection(context.slateEditor, event.editorElement)

    if (result === 'retry' && context.retryCount < MAX_RETRIES) {
      context.retryCount++
      // The DOM hasn't caught up to the model yet. Defer the next attempt
      // to a microtask so React has a chance to commit the pending render.
      queueMicrotask(() => {
        self.send({
          type: 'validate selection',
          editorElement: event.editorElement,
        })
      })
    } else {
      context.retryCount = 0
    }
  },
)

export const validateSelectionMachine = validateSelectionSetup.createMachine({
  id: 'validate selection',
  context: ({input}) => ({
    slateEditor: input.slateEditor,
    retryCount: 0,
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
// which again could be picked up by DOMEditor's event listeners.
// If that range is invalid at that point, the slate.editorSelection could be
// set either wrong, or invalid, to which slateEditor will throw exceptions
// that are impossible to recover properly from or result in a wrong selection.
//
// Also the other way around, when the DOMEditor will try to create a DOM Range
// from the current slateEditor.selection, it may throw unrecoverable errors
// if the current editor.selection is invalid according to the DOM.
//
// When `toDOMRange` throws, it usually means the DOM hasn't yet rendered the
// latest model state — for example mid-action-set, between operation commit
// and React render. Returning 'retry' lets the machine defer the next attempt
// to a microtask. After MAX_RETRIES, fall back to deselecting (without
// selecting the top of the document, which would silently override the
// caller's intended selection).
function validateSelection(
  slateEditor: PortableTextSlateEditor,
  editorElement: HTMLDivElement,
): 'retry' | undefined {
  if (!slateEditor.selection) {
    return undefined
  }

  let root: Document | ShadowRoot | undefined

  try {
    root = DOMEditor.findDocumentOrShadowRoot(slateEditor)
  } catch {}

  if (!root) {
    // The editor has most likely been unmounted
    return undefined
  }

  // Return if the editor isn't the active element
  if (editorElement !== root.activeElement) {
    return undefined
  }
  const window = DOMEditor.getWindow(slateEditor)
  const domSelection = window.getSelection()
  if (!domSelection || domSelection.rangeCount === 0) {
    return undefined
  }
  const existingDOMRange = domSelection.getRangeAt(0)
  try {
    const newDOMRange = DOMEditor.toDOMRange(slateEditor, slateEditor.selection)
    if (
      newDOMRange.startOffset !== existingDOMRange.startOffset ||
      newDOMRange.endOffset !== existingDOMRange.endOffset
    ) {
      debug.selection('DOM range out of sync, validating selection')
      // Remove all ranges temporary
      domSelection?.removeAllRanges()
      // Set the correct range
      domSelection.addRange(newDOMRange)
    }
    return undefined
  } catch {
    debug.selection(
      'Could not resolve selection, deferring validation to next tick',
    )
    return 'retry'
  }
}
