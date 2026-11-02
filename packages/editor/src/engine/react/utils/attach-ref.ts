import type {Ref} from 'react'

/**
 * Attaches `node` to `ref` and returns the function that detaches it again.
 * React 19 calls a callback ref's returned cleanup on detach instead of
 * calling the ref with `null`, so a callback ref that returns a cleanup must
 * detach the refs it forwards to from that cleanup.
 */
export function attachRef<T>(ref: Ref<T> | undefined, node: T): () => void {
  if (typeof ref === 'function') {
    const cleanup = ref(node)
    return typeof cleanup === 'function'
      ? cleanup
      : () => {
          ref(null)
        }
  }

  if (ref) {
    ref.current = node
    return () => {
      ref.current = null
    }
  }

  return () => {}
}
