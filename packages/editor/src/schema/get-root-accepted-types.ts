import type {EditorSchema} from '../editor/editor-schema'

/**
 * Set of types that are valid at the root of the editor's value: the
 * configured text-block type plus every registered block-object type.
 *
 * The editor accepts these at the top level of `value` and uses them
 * to validate input and as the implicit accept-list for any payload
 * that escapes registered containers.
 */
export function getRootAcceptedTypes(schema: EditorSchema): Set<string> {
  return new Set<string>([
    schema.block.name,
    ...schema.blockObjects.map((blockObject) => blockObject.name),
  ])
}
