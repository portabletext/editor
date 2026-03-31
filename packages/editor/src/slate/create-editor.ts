import {apply} from './core/apply'
import {normalizeNode} from './core/normalize-node'
import {select} from './core/select'
import {setSelection} from './core/set-selection'
import {shouldNormalize} from './core/should-normalize'
import {EDITOR_BRAND} from './editor/is-editor'
import type {Editor} from './interfaces/editor'

/**
 * Create a new Slate `Editor` object.
 *
 * The editor is built incrementally — this factory creates the base object with
 * Slate core methods, then withReact/withDOM plugins add ReactEditor and
 * PortableTextSlateEditor methods. We use `as any` for the self-referencing
 * delegates because the object doesn't satisfy `Editor` until after plugin
 * application. This file gets rewritten in the PT-native fork (Step 3).
 */
export const createEditor = (): Editor => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const e: any = {
    [EDITOR_BRAND]: true,
    children: [],
    get value() {
      return this.children
    },
    operations: [],
    selection: null,
    marks: null,
    dirtyPaths: [],
    dirtyPathKeys: new Set(),
    flushing: false,
    normalizing: true,
    batchingDirtyPaths: false,
    pathRefs: new Set(),
    pointRefs: new Set(),
    rangeRefs: new Set(),
    onChange: () => {},

    // Core
    apply: (...args: any[]) => (apply as any)(e, ...args),

    // Editor
    normalizeNode: (...args: any[]) => (normalizeNode as any)(e, ...args),
    shouldNormalize: (...args: any[]) => (shouldNormalize as any)(e, ...args),

    // Overrideable commands
    select: (...args: any[]) => (select as any)(e, ...args),
    setSelection: (...args: any[]) => (setSelection as any)(e, ...args),
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return e as Editor
}
