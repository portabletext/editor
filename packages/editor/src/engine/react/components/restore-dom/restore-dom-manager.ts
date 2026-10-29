import type {RefObject} from 'react'
import {isDOMElement, isTrackedMutation} from '../../../dom/utils/dom'
import type {Editor} from '../../../interfaces/editor'

export type RestoreDOMManager = {
  registerMutations: (mutations: MutationRecord[]) => void
  restoreDOM: () => void
  clear: () => void
}

export const createRestoreDomManager = (
  editor: Editor,
  receivedUserInput: RefObject<boolean>,
): RestoreDOMManager => {
  let bufferedMutations: MutationRecord[] = []

  const clear = () => {
    bufferedMutations = []
  }

  const registerMutations = (mutations: MutationRecord[]) => {
    if (!receivedUserInput.current) {
      return
    }

    const trackedMutations = mutations.filter((mutation) =>
      isTrackedMutation(editor, mutation, mutations),
    )

    bufferedMutations.push(...trackedMutations)
  }

  function restoreDOM() {
    if (bufferedMutations.length > 0) {
      bufferedMutations.reverse().forEach((mutation) => {
        if (mutation.type === 'characterData') {
          // We don't want to restore the DOM for characterData mutations
          // because this interrupts the composition.
          return
        }

        // The IME creates the text node it composes in inside an empty line.
        // Taking it out would restart the composition, and the string element
        // reconciles its own children against the model.
        if (
          editor.composing &&
          isDOMElement(mutation.target) &&
          mutation.target.matches('[data-pt-text], [data-pt-line-break]')
        ) {
          return
        }

        mutation.removedNodes.forEach((node) => {
          mutation.target.insertBefore(node, mutation.nextSibling)
        })

        mutation.addedNodes.forEach((node) => {
          mutation.target.removeChild(node)
        })
      })

      // Clear buffered mutations to ensure we don't undo them twice
      clear()
    }
  }

  return {
    registerMutations,
    restoreDOM,
    clear,
  }
}
