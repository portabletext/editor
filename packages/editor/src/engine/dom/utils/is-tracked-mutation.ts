import type {Editor} from '../../interfaces/editor'
import {DOMEditor} from '../plugin/dom-editor'
import {containsShadowAware, isDOMElement} from './dom'

/**
 * Check whether a mutation originates from a editable element inside the editor.
 */

export const isTrackedMutation = (
  editor: Editor,
  mutation: MutationRecord,
  batch: MutationRecord[],
): boolean => {
  const {target} = mutation
  if (isDOMElement(target) && target.matches('[contentEditable="false"]')) {
    return false
  }

  const {document} = DOMEditor.getWindow(editor)
  if (containsShadowAware(document, target)) {
    return DOMEditor.hasDOMNode(editor, target, {editable: true})
  }

  const parentMutation = batch.find(({addedNodes, removedNodes}) => {
    for (const node of addedNodes) {
      if (node === target || containsShadowAware(node, target)) {
        return true
      }
    }

    for (const node of removedNodes) {
      if (node === target || containsShadowAware(node, target)) {
        return true
      }
    }

    return false
  })

  if (!parentMutation || parentMutation === mutation) {
    return false
  }

  // Target add/remove is tracked. Track the mutation if we track the parent mutation.
  return isTrackedMutation(editor, parentMutation, batch)
}
