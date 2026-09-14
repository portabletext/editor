import {
  hasRemoteFrame,
  type ApplyContextFrame,
} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isPublicOperation, type Operation} from '../types/operation'

export function withRemoteChanges(
  editor: PortableTextEditorEngine,
  source: Extract<ApplyContextFrame, {kind: 'remote'}>['source'],
  fn: () => void,
): void {
  // The outermost bracket collects and emits; a nested `withRemoteChanges`
  // call just contributes its operations to it.
  const isOutermost = !hasRemoteFrame(editor.applyContext)

  const operations: Array<Operation> = []
  const unsubscribe = isOutermost
    ? subscribeToOperations(editor, (event) => {
        if (
          isPublicOperation(event.operation) &&
          !event.context.some((frame) => frame.kind === 'placeholder')
        ) {
          operations.push(event.operation)
        }
      })
    : undefined

  editor.applyContext.push(Object.freeze({kind: 'remote', source}))
  try {
    fn()
  } finally {
    editor.applyContext.pop()
    unsubscribe?.()
  }

  if (isOutermost && operations.length > 0) {
    editor.onRemoteChange(operations)
  }
}
