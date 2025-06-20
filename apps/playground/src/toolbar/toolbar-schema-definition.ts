import type {FieldDefinition, SchemaDefinition} from '@portabletext/editor'

type DecoratorDefinition = NonNullable<SchemaDefinition['decorators']>[number]
type AnnotationDefinition = NonNullable<SchemaDefinition['annotations']>[number]
type ListItemDefinition = NonNullable<SchemaDefinition['lists']>[number]
type BlockObjectDefinition = NonNullable<
  SchemaDefinition['blockObjects']
>[number]
type InlineObjectDefinition = NonNullable<
  SchemaDefinition['inlineObjects']
>[number]
type StyleDefinition = NonNullable<SchemaDefinition['styles']>[number]

export type ToolbarDecoratorDefinition = DecoratorDefinition & {
  icon: React.ComponentType
}
export type ToolbarAnnotationDefinition = AnnotationDefinition & {
  icon: React.ComponentType
  fields: ReadonlyArray<FieldDefinition & {title: string}>
  defaultValues?: Record<string, unknown>
}
export type ToolbarListItemDefinition = ListItemDefinition & {
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
  lists: ReadonlyArray<ToolbarListItemDefinition>
  blockObjects: ReadonlyArray<ToolbarBlockObjectDefinition>
  inlineObjects: ReadonlyArray<ToolbarInlineObjectDefinition>
  styles: ReadonlyArray<ToolbarStyleDefinition>
}
