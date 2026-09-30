import {isTextBlock} from '@portabletext/schema'
import {getNode} from '../../traversal/get-node'
import {getNodes} from '../../traversal/get-nodes'
import {hasNode} from '../../traversal/has-node'
import {buildTouchedPaths} from '../core/touched-paths'
import {getDirtyPathKey} from '../core/update-dirty-paths'
import type {DirtyPathEntry} from '../interfaces/dirty-path-entry'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isNormalizing} from './is-normalizing'
import {withoutNormalizing} from './without-normalizing'

export function normalize(
  editor: Editor,
  options: {force?: boolean; operation?: EngineOperation} = {},
): void {
  const {force = false, operation} = options
  const getDirtyPaths = (editor: Editor) => {
    return editor.dirtyPaths
  }

  const getDirtyPathKeys = (editor: Editor) => {
    return editor.dirtyPathKeys
  }

  // How many leading ledger entries the `shouldNormalize` projection has
  // seen. `updateDirtyPaths` only appends, so a pop can only shrink it.
  let synced = 0

  const popDirtyPath = (editor: Editor): DirtyPathEntry => {
    const entry = getDirtyPaths(editor).pop()!
    getDirtyPathKeys(editor).delete(getDirtyPathKey(entry))
    synced = Math.min(synced, getDirtyPaths(editor).length)
    return entry
  }

  const dropAdjacencyEntries = (editor: Editor) => {
    const dirtyPaths = getDirtyPaths(editor)
    while (dirtyPaths.at(-1)?.kind === 'adjacency') {
      popDirtyPath(editor)
    }
  }

  if (!isNormalizing(editor)) {
    return
  }

  if (force) {
    const allEntries = Array.from(
      getNodes(editor.snapshot),
      (entry): DirtyPathEntry => ({
        path: entry.path,
        kind: 'node',
        origin: 'force',
      }),
    )
    editor.dirtyPaths = allEntries
    editor.dirtyPathKeys = new Map(
      allEntries.map((entry) => [getDirtyPathKey(entry), entry]),
    )
  }

  if (!getDirtyPaths(editor).some((entry) => entry.kind !== 'adjacency')) {
    getDirtyPaths(editor).length = 0
    getDirtyPathKeys(editor).clear()
    return
  }

  const touched = buildTouchedPaths(editor, getDirtyPaths(editor))

  withoutNormalizing(editor, () => {
    /*
      Fix dirty elements with no children.
      editor.normalizeNode() does fix this, but some normalization fixes also require it to work.
      Running an initial pass avoids the catch-22 race condition.
    */
    for (const {path: dirtyPath, kind} of getDirtyPaths(editor)) {
      if (kind === 'adjacency' || dirtyPath.length === 0) {
        continue
      }

      if (hasNode(editor.snapshot, dirtyPath)) {
        const entry = getNode(editor.snapshot, dirtyPath)
        if (!entry) {
          continue
        }
        const entryNode = entry.node

        /*
          The default normalizer inserts an empty text node in this scenario, but it can be customised.
          So there is some risk here.

          As long as the normalizer only inserts child nodes for this case it is safe to do in any order;
          by definition adding children to an empty node can't cause other paths to change.
        */
        if (
          isTextBlock({schema: editor.snapshot.context.schema}, entryNode) &&
          entryNode.children.length === 0
        ) {
          editor.applyContext.push(Object.freeze({kind: 'normalization'}))
          try {
            editor.normalizeNode([entry.node, entry.path], {
              operation,
              touched,
            })
          } finally {
            editor.applyContext.pop()
          }
        }
      }
    }

    // `shouldNormalize` sees plain paths, without adjacency entries. The
    // projection is extended wherever the ledger may have grown: before
    // `shouldNormalize`, after it (a callback may apply operations), and
    // after each visit.
    const dirtyPaths: Path[] = []
    const sync = () => {
      dropAdjacencyEntries(editor)
      pushNodePaths(getDirtyPaths(editor), synced, dirtyPaths)
      synced = getDirtyPaths(editor).length
    }
    sync()
    const initialDirtyPathsLength = dirtyPaths.length
    let iteration = 0

    while (dirtyPaths.length !== 0) {
      if (
        !editor.shouldNormalize({
          dirtyPaths,
          iteration,
          initialDirtyPathsLength,
          operation,
        })
      ) {
        return
      }

      sync()
      dirtyPaths.pop()
      const dirtyPath = popDirtyPath(editor).path

      // If the node doesn't exist in the tree, it does not need to be normalized.
      if (dirtyPath.length === 0) {
        editor.applyContext.push(Object.freeze({kind: 'normalization'}))
        try {
          editor.normalizeNode([editor, dirtyPath], {
            operation,
            touched,
          })
        } finally {
          editor.applyContext.pop()
        }
      } else if (hasNode(editor.snapshot, dirtyPath)) {
        const entry = getNode(editor.snapshot, dirtyPath)
        if (entry) {
          editor.applyContext.push(Object.freeze({kind: 'normalization'}))
          try {
            editor.normalizeNode([entry.node, entry.path], {
              operation,
              touched,
            })
          } finally {
            editor.applyContext.pop()
          }
        }
      }
      iteration++
      sync()
    }

    getDirtyPaths(editor).length = 0
    getDirtyPathKeys(editor).clear()
  })
}

function pushNodePaths(
  entries: Array<DirtyPathEntry>,
  start: number,
  paths: Array<Path>,
) {
  for (let index = start; index < entries.length; index++) {
    const entry = entries[index]!

    if (entry.kind !== 'adjacency') {
      paths.push(entry.path)
    }
  }
}
