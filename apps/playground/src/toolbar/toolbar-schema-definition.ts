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

export type ToolbarDecoratorDefinition = DecoratorDefinition & {
  icon: React.ComponentType
  shortcut?: KeyboardShortcut
  mutuallyExclusive?: ReadonlyArray<DecoratorDefinition['name']>
}
export type ToolbarAnnotationDefinition = AnnotationDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}
export type ToolbarListDefinition = ListDefinition & {
  icon: React.ComponentType
}
export type ToolbarBlockObjectDefinition = BlockObjectDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}
export type ToolbarInlineObjectDefinition = InlineObjectDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}
export type ToolbarStyleDefinition = StyleDefinition & {
  icon: React.ComponentType
}

export type ToolbarSchemaDefinition = {
  decorators: ReadonlyArray<ToolbarDecoratorDefinition>
  annotations: ReadonlyArray<ToolbarAnnotationDefinition>
  lists: ReadonlyArray<ToolbarListDefinition>
  blockObjects: ReadonlyArray<ToolbarBlockObjectDefinition>
  inlineObjects: ReadonlyArray<ToolbarInlineObjectDefinition>
  styles: ReadonlyArray<ToolbarStyleDefinition>
}
