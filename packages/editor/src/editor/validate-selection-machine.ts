import {setup} from 'xstate'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {start} from '../engine/editor/start'
import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
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
// and make sure that we can maintain a stable editorEngine.selection when that happens.
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
// from the current editorEngine.selection, it may throw unrecoverable errors
// if the current editor.selection is invalid according to the DOM.
// If this is the case, default to selecting the top of the document, if the
// user already had a selection.
function validateSelection(
  editorEngine: PortableTextEditorEngine,
  editorElement: HTMLDivElement,
) {
  if (!editorEngine.selection) {
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
      editorEngine.selection,
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
    debug.selection(`Could not resolve selection, selecting top document`)
    // Deselect the editor
    applyDeselect(editorEngine)
    // Select top document if there is a top block to select
    if (editorEngine.children.length > 0) {
      applySelect(editorEngine, start(editorEngine, []))
    }
    editorEngine.onChange()
  }
}
