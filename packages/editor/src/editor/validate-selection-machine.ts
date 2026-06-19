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

// This function handles unexpected DOM changes inside the Editable so the
// engine's model selection stays stable. The Editable can be re-rendered while
// the user is still actively changing the contentEditable (hidden contexts,
// outer state); the intermediate DOM selection it observes can be invalid
// against the engine's snapshot, and synchronously syncing either direction
// without guards leads to unrecoverable errors. When `toDOMRange` can't
// resolve the engine's selection on the current DOM (typically a race ahead
// of React's commit), this pass skips the sync and the next MutationObserver
// tick retries once the DOM catches up.
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
    debug.selection(`Could not resolve selection, selecting top document`)
    // Deselect the editor
    applyDeselect(editorEngine)
    // Select top document if there is a top block to select
    if (editorEngine.snapshot.context.value.length > 0) {
      applySelect(editorEngine, start(editorEngine, []))
    }
    editorEngine.onChange()
  }
}
