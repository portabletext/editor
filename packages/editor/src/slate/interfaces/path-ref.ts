import type {Operation, Path} from '..'
import {transformPath} from '../path/transform-path'

/**
 * `PathRef` objects keep a specific path in a document synced over time as new
 * operations are applied to the editor. You can access their `current` property
 * at any time for the up-to-date path value.
 */

export interface PathRef {
  current: Path | null
  affinity: 'forward' | 'backward' | null
  unref(): Path | null
}

export interface PathRefInterface {
  transform: (ref: PathRef, op: Operation) => void
}

// eslint-disable-next-line no-redeclare
export const PathRef: PathRefInterface = {
  transform(ref: PathRef, op: Operation): void {
    const {current} = ref

    if (current == null) {
      return
    }

    const path = transformPath(current, op)
    ref.current = path

    if (path == null) {
      ref.unref()
    }
  },
}
