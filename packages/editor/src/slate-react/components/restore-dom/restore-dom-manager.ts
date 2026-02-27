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

        mutation.removedNodes.forEach((node) => {
          try {
            mutation.target.insertBefore(node, mutation.nextSibling)
          } catch {
            // The DOM may have been modified by a React render (e.g.,
            // rangeDecoration updates) between the mutation and the
            // restore. This is expected on Android where the IME mutates
            // the DOM before JavaScript can intercept. The editor
            // self-heals on the next render cycle.
          }
        })

        mutation.addedNodes.forEach((node) => {
          try {
            mutation.target.removeChild(node)
          } catch {
            // Same as above — the node may have already been removed
            // by React before we could undo the mutation.
          }
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
