import {setup} from 'xstate'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {debug} from '../internal-utils/debug'
import type {PortableTextEditorEngine} from '../types/editor-engine'

const validateSelectionSetup = setup({
  types: {
    context: {} as {
      editorEngine: PortableTextEditorEngine
    },
    input: {} as {
      editorEngine: PortableTextEditorEngine
    },
    events: {} as {
      type: 'validate selection'
      editorElement: HTMLDivElement
    },
  },
  guards: {
    'pending operations': ({context}) =>
      context.editorEngine.operations.length > 0,
  },
})

const validateSelectionAction = validateSelectionSetup.createAction(
  ({context, event}) => {
    validateSelection(context.editorEngine, event.editorElement)
  },
)

export const validateSelectionMachine = validateSelectionSetup.createMachine({
  id: 'validate selection',
  context: ({input}) => ({
    editorEngine: input.editorEngine,
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
// and make sure that we can maintain a stable editorEngine.snapshot.context.selection when that happens.
//
// For example, if this Editable is rendered inside something that might re-render
// this component (hidden contexts) while the user is still actively changing the
// contentEditable, this could interfere with the intermediate DOM selection,
// which again could be picked up by DOMEditor's event listeners.
// If that range is invalid at that point, the engine's selection could be
// set either wrong, or invalid, to which editorEngine will throw exceptions
// that are impossible to recover properly from or result in a wrong selection.
//
// Also the other way around, when the DOMEditor will try to create a DOM Range
// from the current editorEngine.snapshot.context.selection, it may throw unrecoverable errors
// if the current editor.snapshot.context.selection is invalid according to the DOM.
// When that happens this pass skips the sync; the MutationObserver driving
// the machine will fire again once React commits and the next pass will succeed.
function validateSelection(
  editorEngine: PortableTextEditorEngine,
  editorElement: HTMLDivElement,
) {
  if (!editorEngine.snapshot.context.selection) {
    return
  }

  let root: Document | ShadowRoot | undefined

  try {
    root = DOMEditor.findDocumentOrShadowRoot(editorEngine)
  } catch {}

  if (!root) {
    // The editor has most likely been unmounted
    return
  }

  // Return if the editor isn't the active element
  if (editorElement !== root.activeElement) {
    return
  }
  const window = DOMEditor.getWindow(editorEngine)
  const domSelection = window.getSelection()
  if (!domSelection || domSelection.rangeCount === 0) {
    return
  }
  const existingDOMRange = domSelection.getRangeAt(0)
  try {
    const newDOMRange = DOMEditor.toDOMRange(
      editorEngine,
      editorEngine.snapshot.context.selection,
    )
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
  } catch {
    // `toDOMRange` raced ahead of React's commit. The MutationObserver
    // driving this machine will fire again once the DOM catches up, and
    // the next pass will succeed. Don't touch the model selection here.
    debug.selection(`Could not resolve selection, skipping DOM sync this tick`)
  }
}
