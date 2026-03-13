import {Path, Point, type Editor, type Operation} from '../../slate'
import {levels} from '../../slate/editor/levels'
import {node as editorNode} from '../../slate/editor/node'
import {
  transformPendingPoint,
  transformPendingRange,
  transformTextDiff,
  type TextDiff,
} from '../utils/diff-text'
import type {Key} from '../utils/key'
import {DOMEditor} from './dom-editor'

/**
 * `withDOM` adds DOM specific behaviors to the editor.
 *
 * If you are using TypeScript, you must extend Slate's CustomTypes to use
 * this plugin.
 *
 * See https://docs.slatejs.org/concepts/11-typescript to learn how.
 */

export const withDOM = <T extends Editor>(editor: T): T & DOMEditor => {
  const e = editor as T & DOMEditor
  const {apply, onChange} = e

  // Initialize DOMEditor state properties
  e.isNodeMapDirty = false
  e.domWindow = null
  e.domElement = null
  e.domPlaceholder = ''
  e.domPlaceholderElement = null
  e.keyToElement = new WeakMap()
  e.nodeToIndex = new WeakMap()
  e.nodeToParent = new WeakMap()
  e.elementToNode = new WeakMap()
  e.nodeToElement = new WeakMap()
  e.nodeToKey = new WeakMap()
  e.readOnly = false
  e.focused = false
  e.composing = false
  e.userSelection = null
  e.onContextChange = null
  e.scheduleFlush = null
  e.pendingInsertionMarks = null
  e.userMarks = null
  e.pendingDiffs = []
  e.pendingAction = null
  e.pendingSelection = null
  e.forceRender = null

  // This attempts to reset the nodeToKey entry to the correct value
  // as apply() changes the object reference and hence invalidates the nodeToKey entry
  e.apply = (op: Operation) => {
    const matches: [Path, Key][] = []

    const pendingDiffs = e.pendingDiffs
    if (pendingDiffs?.length) {
      const transformed = pendingDiffs
        .map((textDiff) => transformTextDiff(textDiff, op))
        .filter(Boolean) as TextDiff[]

      e.pendingDiffs = transformed
    }

    const pendingSelection = e.pendingSelection
    if (pendingSelection) {
      e.pendingSelection = transformPendingRange(e, pendingSelection, op)
    }

    const pendingAction = e.pendingAction
    if (pendingAction?.at) {
      const at = Point.isPoint(pendingAction?.at)
        ? transformPendingPoint(e, pendingAction.at, op)
        : transformPendingRange(e, pendingAction.at, op)

      e.pendingAction = at ? {...pendingAction, at} : null
    }

    switch (op.type) {
      case 'insert_text':
      case 'remove_text':
      case 'set_node': {
        matches.push(...getMatches(e, op.path))
        break
      }

      case 'set_selection': {
        // Selection was manually set, don't restore the user selection after the change.
        e.userSelection?.unref()
        e.userSelection = null
        break
      }

      case 'insert_node':
      case 'remove_node': {
        matches.push(...getMatches(e, Path.parent(op.path)))
        break
      }
    }

    apply(op)

    switch (op.type) {
      case 'insert_node':
      case 'remove_node':
      case 'insert_text':
      case 'remove_text':
      case 'set_selection': {
        // FIXME: Rename to something like IS_DOM_EDITOR_DESYNCED
        // to better reflect reality, see #5792
        e.isNodeMapDirty = true
      }
    }

    for (const [path, key] of matches) {
      const [node] = editorNode(e, path)
      e.nodeToKey.set(node, key)
    }
  }

  e.onChange = (options) => {
    const onContextChange = e.onContextChange

    if (onContextChange) {
      onContextChange(options)
    }

    onChange(options)
  }

  return e
}

const getMatches = (e: Editor, path: Path) => {
  const matches: [Path, Key][] = []
  for (const [n, p] of levels(e, {at: path})) {
    const key = DOMEditor.findKey(e, n)
    matches.push([p, key])
  }
  return matches
}
