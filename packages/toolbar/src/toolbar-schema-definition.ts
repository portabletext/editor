import type {
  AnnotationDefinition,
  BlockObjectDefinition,
  DecoratorDefinition,
  FieldDefinition,
  InlineObjectDefinition,
  ListDefinition,
  StyleDefinition,
} from '@portabletext/editor'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'

/**
 * @beta
 * Extended schema definition with icons, field titles, default values and
 * more. This makes it easier to use the schema definition to render toolbars
 * , forms and other UI components.
 */
export function defineToolbarSchema<
  const TToolbarSchemaDefinition extends ToolbarSchemaDefinition,
>(definition: TToolbarSchemaDefinition): TToolbarSchemaDefinition {
  return definition
}

/**
 * @beta
 */
export type ToolbarSchemaDefinition = {
  decorators?: ReadonlyArray<ToolbarDecoratorDefinition>
  annotations?: ReadonlyArray<ToolbarAnnotationDefinition>
  lists?: ReadonlyArray<ToolbarListDefinition>
  blockObjects?: ReadonlyArray<ToolbarBlockObjectDefinition>
  inlineObjects?: ReadonlyArray<ToolbarInlineObjectDefinition>
  styles?: ReadonlyArray<ToolbarStyleDefinition>
}

/**
 * @beta
 */
export type ToolbarDecoratorDefinition = DecoratorDefinition & {
  icon: React.ComponentType
  shortcut?: KeyboardShortcut
  mutuallyExclusive?: ReadonlyArray<DecoratorDefinition['name']>
}

/**
 * @beta
 */
export type ToolbarAnnotationDefinition = AnnotationDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}

/**
 * @beta
 */
export type ToolbarListDefinition = ListDefinition & {
  icon: React.ComponentType
}

/**
 * @beta
 */
export type ToolbarBlockObjectDefinition = BlockObjectDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}

/**
 * @beta
 */
export type ToolbarInlineObjectDefinition = InlineObjectDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}

/**
 * @beta
 */
export type ToolbarStyleDefinition = StyleDefinition & {
  icon: React.ComponentType
}
