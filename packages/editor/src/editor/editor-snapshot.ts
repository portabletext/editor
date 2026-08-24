import type {PortableTextBlock} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
import type {Containers} from '../schema/resolve-containers'
import type {EditorSelection} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorSchema} from './editor-schema'

/**
 * @public
 */
export type EditorContext = {
  converters: Array<Converter>
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
  /**
   * Map of registered editable containers keyed by their bare
   * block-object `_type` (e.g. `'callout'`, `'table'`).
   *
   * Each entry is a {@link RegisteredContainer} carrying `type`,
   * the array `field` that holds the container's editable children,
   * and (when present) the nested positional `of` registrations the
   * engine consults when it descends into the container. The render
   * callback is engine-internal and not surfaced here.
   *
   * Only top-level registrations appear as flat entries. A `_type`
   * registered only inside a parent's `of` is reachable through that
   * parent's `of`, not as a top-level entry. For position-aware descent,
   * walk the entries with `getContainerChildren` from
   * `@portabletext/editor/traversal`.
   *
   * @public
   */
  containers: Containers
}

/**
 * @public
 */
export type EditorSnapshot = {
  context: EditorContext
  blockIndexMap: ReadonlyMap<string, number>
  /**
   * @beta
   * Subject to change
   */
  decoratorState: Record<string, boolean | undefined>
}

export function createEditorSnapshot({
  converters,
  editor,
  keyGenerator,
  readOnly,
  schema,
}: {
  converters: Array<Converter>
  editor: PortableTextEditorEngine
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
}) {
  const selection = editor.snapshot.context.selection

  const context = {
    containers: editor.snapshot.context.containers,
    converters,
    keyGenerator,
    readOnly,
    schema,
    selection,
    value: editor.snapshot.context.value,
  } satisfies EditorContext

  return {
    blockIndexMap: editor.blockIndexMap,
    context,
    decoratorState: editor.snapshot.decoratorState,
  } satisfies EditorSnapshot
}
