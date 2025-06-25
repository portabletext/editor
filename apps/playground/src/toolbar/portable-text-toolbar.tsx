import {Group} from '../primitives/group'
import {Separator} from '../primitives/separator'
import {Toolbar} from '../primitives/toolbar'
import {AnnotationButton} from './button.annotation'
import {BlockObjectButton} from './button.block-object'
import {DecoratorButton} from './button.decorator'
import {FocusButton} from './button.focus'
import {InlineObjectButton} from './button.inline-object'
import {ListButton} from './button.list'
import {StyleButton} from './button.style'
import {AnnotationPopover} from './popover.annotation'
import {BlockObjectPopover} from './popover.block-object'
import {InlineObjectPopover} from './popover.inline-object'
import type {ToolbarSchemaDefinition} from './toolbar-schema-definition'

export function PortableTextToolbar(props: {
  schemaDefinition: ToolbarSchemaDefinition
  children?: React.ReactNode
}) {
  return (
    <>
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
            <ListButton key={list.name} definition={list} />
          ))}
        </Group>
        <Separator orientation="vertical" />
        <Group aria-label="Block Objects">
          {props.schemaDefinition.blockObjects.map((blockObject) => (
            <BlockObjectButton
              key={blockObject.name}
              definition={blockObject}
            />
          ))}
        </Group>
        <Separator orientation="vertical" />
        <Group aria-label="Inline Objects">
          {props.schemaDefinition.inlineObjects.map((inlineObject) => (
            <InlineObjectButton
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
      <AnnotationPopover definitions={props.schemaDefinition.annotations} />
      <BlockObjectPopover definitions={props.schemaDefinition.blockObjects} />
      <InlineObjectPopover definitions={props.schemaDefinition.inlineObjects} />
    </>
  )
}
