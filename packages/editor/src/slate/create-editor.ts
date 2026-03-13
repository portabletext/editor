import type {EditorSchema} from '../editor/editor-schema'
import {apply} from './core/apply'
import {getDirtyPaths} from './core/get-dirty-paths'
import {normalizeNode} from './core/normalize-node'
import {select} from './core/select'
import {setSelection} from './core/set-selection'
import {shouldNormalize} from './core/should-normalize'
import type {Editor} from './interfaces/editor'
import type {Text} from './interfaces/text'

/**
 * Create a new Slate `Editor` object.
 *
 * The editor is built incrementally — this factory creates the base object with
 * Slate core methods, then withReact/withDOM plugins add ReactEditor and
 * PortableTextSlateEditor methods. We use `as any` for the self-referencing
 * delegates because the object doesn't satisfy `Editor` until after plugin
 * application. This file gets rewritten in the PT-native fork (Step 3).
 */
export const createEditor = (context: {
  schema: EditorSchema
  keyGenerator: () => string
}): Editor => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const e: any = {
    children: [],
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
    createSpan: () =>
      ({
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      }) as Text,
    isElementReadOnly: () => false,
    isInline: () => false,
    isSelectable: () => true,
    onChange: () => {},

    // Core
    apply: (...args: any[]) => (apply as any)(e, ...args),

    // Editor
    normalizeNode: (...args: any[]) => (normalizeNode as any)(e, ...args),
    getDirtyPaths: (...args: any[]) => (getDirtyPaths as any)(e, ...args),
    shouldNormalize: (...args: any[]) => (shouldNormalize as any)(e, ...args),

    // Overrideable commands
    insertText: () => {},
    select: (...args: any[]) => (select as any)(e, ...args),
    setSelection: (...args: any[]) => (setSelection as any)(e, ...args),
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return e as Editor
}
