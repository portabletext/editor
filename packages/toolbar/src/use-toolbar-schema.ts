import {
  useEditor,
  useEditorSelector,
  type AnnotationSchemaType,
  type BlockObjectSchemaType,
  type DecoratorDefinition,
  type DecoratorSchemaType,
  type InlineObjectSchemaType,
  type ListSchemaType,
  type StyleSchemaType,
} from '@portabletext/editor'
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
 * Extend the editor's schema with default values, icons, shortcuts and more.
 * This makes it easier to use the schema to render toolbars, forms and other
 * UI components.
 */
export function useToolbarSchema(props: {
  extendDecorator?: (
    decorator: DecoratorSchemaType,
  ) => ToolbarDecoratorSchemaType
  extendAnnotation?: (
    annotation: AnnotationSchemaType,
  ) => ToolbarAnnotationSchemaType
  extendList?: (list: ListSchemaType) => ToolbarListSchemaType
  extendBlockObject?: (
    blockObject: BlockObjectSchemaType,
  ) => ToolbarBlockObjectSchemaType
  extendInlineObject?: (
    inlineObject: InlineObjectSchemaType,
  ) => ToolbarInlineObjectSchemaType
  extendStyle?: (style: StyleSchemaType) => ToolbarStyleSchemaType
}): ToolbarSchema {
  const editor = useEditor()
  const schema = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.schema,
  )

  return {
    decorators: schema.decorators.map(
      (decorator) => props.extendDecorator?.(decorator) ?? decorator,
    ),
    annotations: schema.annotations.map(
      (annotation) => props.extendAnnotation?.(annotation) ?? annotation,
    ),
    lists: schema.lists.map((list) => props.extendList?.(list) ?? list),
    blockObjects: schema.blockObjects.map(
      (blockObject) => props.extendBlockObject?.(blockObject) ?? blockObject,
    ),
    inlineObjects: schema.inlineObjects.map(
      (inlineObject) =>
        props.extendInlineObject?.(inlineObject) ?? inlineObject,
    ),
    styles: schema.styles.map((style) => props.extendStyle?.(style) ?? style),
  }
}

/**
 * @beta
 */
export type ToolbarSchema = {
  decorators?: ReadonlyArray<ToolbarDecoratorSchemaType>
  annotations?: ReadonlyArray<ToolbarAnnotationSchemaType>
  lists?: ReadonlyArray<ToolbarListSchemaType>
  blockObjects?: ReadonlyArray<ToolbarBlockObjectSchemaType>
  inlineObjects?: ReadonlyArray<ToolbarInlineObjectSchemaType>
  styles?: ReadonlyArray<ToolbarStyleSchemaType>
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
