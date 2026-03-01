import type {RefObject} from 'react'
import {isTrackedMutation} from '../../../slate-dom'
import type {Editor} from '../../../slate/interfaces/editor'

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

        // During composition (IME input), the browser may restructure the
        // DOM (add/remove nodes for composition UI). Reverting these
        // structural mutations would undo the composition text, causing
        // the hybrid input manager's parse-and-diff to see "no change."
        // Skip structural restoration while composing — the hybrid input
        // manager will reconcile after compositionEnd.
        if (editor.composing) {
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
