import {
  useEditor,
  useEditorSelector,
  type AnnotationDefinition,
  type AnnotationSchemaType,
  type BlockObjectSchemaType,
  type DecoratorDefinition,
  type DecoratorSchemaType,
  type EditorSchema,
  type InlineObjectSchemaType,
  type ListSchemaType,
  type StyleSchemaType,
} from '@portabletext/editor'
import {getUnionSchema} from '@portabletext/editor/traversal'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'

/**
 * @beta
 */
export type ExtendDecoratorSchemaType = (
  decorator: DecoratorSchemaType,
) => ToolbarDecoratorSchemaType

/**
 * @beta
 */
export type ExtendAnnotationSchemaType = (
  annotation: AnnotationSchemaType,
) => ToolbarAnnotationSchemaType

/**
 * @beta
 */
export type ExtendListSchemaType = (
  list: ListSchemaType,
) => ToolbarListSchemaType

/**
 * @beta
 */
export type ExtendBlockObjectSchemaType = (
  blockObject: BlockObjectSchemaType,
) => ToolbarBlockObjectSchemaType

/**
 * @beta
 */
export type ExtendInlineObjectSchemaType = (
  inlineObject: InlineObjectSchemaType,
) => ToolbarInlineObjectSchemaType

/**
 * @beta
 */
export type ExtendStyleSchemaType = (
  style: StyleSchemaType,
) => ToolbarStyleSchemaType

/**
 * @beta
 *
 * Resolve the editor's full toolbar schema. Returns the union of every
 * decorator, annotation, list, style, block object and inline object declared
 * anywhere in the editor's schema graph that is reachable from a position
 * where text is edited - the root schema merged with the sub-schema of every
 * registered container whose field accepts text blocks. Useful for rendering
 * a static toolbar whose buttons stay stable across selection moves.
 *
 * Re-renders only when the schema graph or the extension callbacks change.
 * Pair with {@link useApplicableSchema} to determine which entries are
 * applicable at the current selection (which buttons should be enabled vs.
 * disabled).
 */
export function useToolbarSchema(props: {
  extendDecorator?: ExtendDecoratorSchemaType
  extendAnnotation?: ExtendAnnotationSchemaType
  extendList?: ExtendListSchemaType
  extendBlockObject?: ExtendBlockObjectSchemaType
  extendInlineObject?: ExtendInlineObjectSchemaType
  extendStyle?: ExtendStyleSchemaType
}): ToolbarSchema {
  const editor = useEditor()
  const union = useEditorSelector(
    editor,
    (snapshot) =>
      getUnionSchema(snapshot.context.schema, snapshot.context.containers),
    compareSchemas,
  )

  return {
    decorators: union.decorators.map(
      (decorator) => props.extendDecorator?.(decorator) ?? decorator,
    ),
    annotations: union.annotations.map(
      (annotation) => props.extendAnnotation?.(annotation) ?? annotation,
    ),
    lists: union.lists.map((list) => props.extendList?.(list) ?? list),
    blockObjects: union.blockObjects.map(
      (blockObject) => props.extendBlockObject?.(blockObject) ?? blockObject,
    ),
    inlineObjects: union.inlineObjects.map(
      (inlineObject) =>
        props.extendInlineObject?.(inlineObject) ?? inlineObject,
    ),
    styles: union.styles.map((style) => props.extendStyle?.(style) ?? style),
  }
}

/**
 * @beta
 */
export type ToolbarSchema = {
  decorators: ReadonlyArray<ToolbarDecoratorSchemaType>
  annotations: ReadonlyArray<ToolbarAnnotationSchemaType>
  lists: ReadonlyArray<ToolbarListSchemaType>
  blockObjects: ReadonlyArray<ToolbarBlockObjectSchemaType>
  inlineObjects: ReadonlyArray<ToolbarInlineObjectSchemaType>
  styles: ReadonlyArray<ToolbarStyleSchemaType>
}

/**
 * @beta
 */
export type ToolbarDecoratorSchemaType = DecoratorSchemaType & {
  icon?: React.ComponentType
  shortcut?: KeyboardShortcut
  mutuallyExclusive?: ReadonlyArray<DecoratorDefinition['name']>
}

/**
 * @beta
 */
export type ToolbarAnnotationSchemaType = AnnotationSchemaType & {
  icon?: React.ComponentType
  defaultValues?: Record<string, unknown>
  shortcut?: KeyboardShortcut
  mutuallyExclusive?: ReadonlyArray<AnnotationDefinition['name']>
}

/**
 * @beta
 */
export type ToolbarListSchemaType = ListSchemaType & {
  icon?: React.ComponentType
}

/**
 * @beta
 */
export type ToolbarBlockObjectSchemaType = BlockObjectSchemaType & {
  icon?: React.ComponentType
  defaultValues?: Record<string, unknown>
  shortcut?: KeyboardShortcut
}

/**
 * @beta
 */
export type ToolbarInlineObjectSchemaType = InlineObjectSchemaType & {
  icon?: React.ComponentType
  defaultValues?: Record<string, unknown>
  shortcut?: KeyboardShortcut
}

/**
 * @beta
 */
export type ToolbarStyleSchemaType = StyleSchemaType & {
  icon?: React.ComponentType
  shortcut?: KeyboardShortcut
}

function compareSchemas(a: EditorSchema, b: EditorSchema) {
  if (a === b) {
    return true
  }
  return (
    compareNamed(a.decorators, b.decorators) &&
    compareNamed(a.annotations, b.annotations) &&
    compareNamed(a.lists, b.lists) &&
    compareNamed(a.styles, b.styles) &&
    compareNamed(a.blockObjects, b.blockObjects) &&
    compareNamed(a.inlineObjects, b.inlineObjects)
  )
}

function compareNamed(
  a: ReadonlyArray<{name: string}>,
  b: ReadonlyArray<{name: string}>,
) {
  if (a === b) {
    return true
  }
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.name !== b[i]!.name) {
      return false
    }
  }
  return true
}
