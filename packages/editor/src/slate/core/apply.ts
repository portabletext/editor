import {getDirtyIndexedPaths} from '../../paths/get-dirty-indexed-paths'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {PathRef} from '../interfaces/path-ref'
import {PointRef} from '../interfaces/point-ref'
import {operationCanTransformPath} from '../path/operation-can-transform-path'
import {transformPath} from '../path/transform-path'
import {transformRangeRef} from '../range-ref/transform-range-ref'
import type {WithEditorFirstArg} from '../utils/types'
import {applyOperation} from './apply-operation'
import {isBatchingDirtyPaths} from './batch-dirty-paths'
import {updateDirtyPaths} from './update-dirty-paths'

export const apply: WithEditorFirstArg<Editor['apply']> = (editor, op) => {
  for (const ref of editor.pathRefs) {
    PathRef.transform(ref, op)
  }

  for (const ref of editor.pointRefs) {
    PointRef.transform(ref, op)
  }

  for (const ref of editor.rangeRefs) {
    transformRangeRef(ref, op)
  }

  // update dirty paths
  if (!isBatchingDirtyPaths(editor)) {
    const transform = operationCanTransformPath(op)
      ? (p: Path) => transformPath(p, op)
      : undefined
    updateDirtyPaths(editor, getDirtyIndexedPaths(editor, op), transform)
  }

  applyOperation(editor, op)

  editor.operations.push(op)
  normalize(editor, {
    operation: op,
  })

  // Clear any formats applied to the cursor if the selection changes.
  if (op.type === 'set_selection') {
    editor.marks = null
  }

  if (!editor.flushing) {
    editor.flushing = true

    Promise.resolve().then(() => {
      editor.flushing = false
      editor.onChange({operation: op})
      editor.operations = []
    })
  }
}
