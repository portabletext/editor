import {Group} from './components/group'
import {Separator} from './components/separator'
import {Toolbar} from './components/toolbar'
import type {PlaygroundSchemaDefinition} from './playground-schema-definition'
import {AnnotationButton} from './toolbar/annotation-button'
import {DecoratorButton} from './toolbar/decorator-button'
import {FocusButton} from './toolbar/focus-button'
import {InsertBlockObjectButton} from './toolbar/insert-block-object-button'
import {InsertInlineObjectButton} from './toolbar/insert-inline-object-button'
import {ListItemButton} from './toolbar/list-item-button'
import {StyleButton} from './toolbar/style-button'

export function PortableTextToolbar(props: {
  schemaDefinition: PlaygroundSchemaDefinition
  children?: React.ReactNode
}) {
  return (
    <Toolbar aria-label="Editor toolbar">
      <StyleButton definitions={props.schemaDefinition.styles} />
      <Separator orientation="vertical" />
      <Group aria-label="Decorators">
        {props.schemaDefinition.decorators?.map((decorator) => (
          <DecoratorButton key={decorator.name} definition={decorator} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Annotations">
        {props.schemaDefinition.annotations.map((annotation) => (
          <AnnotationButton key={annotation.name} definition={annotation} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Lists">
        {props.schemaDefinition.lists.map((list) => (
          <ListItemButton key={list.name} definition={list} />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Block Objects">
        {props.schemaDefinition.blockObjects.map((blockObject) => (
          <InsertBlockObjectButton
            key={blockObject.name}
            definition={blockObject}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Inline Objects">
        {props.schemaDefinition.inlineObjects.map((inlineObject) => (
          <InsertInlineObjectButton
            key={inlineObject.name}
            definition={inlineObject}
          />
        ))}
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Debugging">
        <FocusButton />
      </Group>
      <Separator orientation="vertical" />
      <Group aria-label="Extra">{props.children}</Group>
    </Toolbar>
  )
}
