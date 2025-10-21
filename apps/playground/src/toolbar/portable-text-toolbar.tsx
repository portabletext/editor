import {Group} from '../primitives/group'
import {Separator} from '../primitives/separator'
import {Toolbar} from '../primitives/toolbar'
import {AnnotationButton} from './button.annotation'
import {BlockObjectButton} from './button.block-object'
import {DecoratorButton} from './button.decorator'
import {FocusButton} from './button.focus'
import {HistoryButtons} from './button.history'
import {InlineObjectButton} from './button.inline-object'
import {ListButton} from './button.list'
import {StyleButton} from './button.style'
import {AnnotationPopover} from './popover.annotation'
import {BlockObjectPopover} from './popover.block-object'
import {InlineObjectPopover} from './popover.inline-object'
import {usePlaygroundToolbarSchema} from './toolbar-schema'

export function PortableTextToolbar(props: {children?: React.ReactNode}) {
  const toolbarSchema = usePlaygroundToolbarSchema()

  return (
    <>
      <Toolbar aria-label="Editor toolbar">
        <HistoryButtons />
        {toolbarSchema.styles ? (
          <>
            <Separator orientation="vertical" />
            <StyleButton schemaTypes={toolbarSchema.styles} />
          </>
        ) : null}
        {toolbarSchema.decorators ? (
          <>
            <Separator orientation="vertical" />
            <Group aria-label="Decorators">
              {toolbarSchema.decorators.map((decorator) => (
                <DecoratorButton key={decorator.name} schemaType={decorator} />
              ))}
            </Group>
          </>
        ) : null}
        {toolbarSchema.annotations ? (
          <>
            <Separator orientation="vertical" />
            <Group aria-label="Annotations">
              {toolbarSchema.annotations.map((annotation) => (
                <AnnotationButton
                  key={annotation.name}
                  schemaType={annotation}
                />
              ))}
            </Group>
          </>
        ) : null}
        {toolbarSchema.lists ? (
          <>
            <Separator orientation="vertical" />
            <Group aria-label="Lists">
              {toolbarSchema.lists.map((list) => (
                <ListButton key={list.name} schemaType={list} />
              ))}
            </Group>
          </>
        ) : null}
        {toolbarSchema.blockObjects ? (
          <>
            <Separator orientation="vertical" />
            <Group aria-label="Block Objects">
              {toolbarSchema.blockObjects.map((blockObject) => (
                <BlockObjectButton
                  key={blockObject.name}
                  schemaType={blockObject}
                />
              ))}
            </Group>
          </>
        ) : null}
        {toolbarSchema.inlineObjects ? (
          <>
            <Separator orientation="vertical" />
            <Group aria-label="Inline Objects">
              {toolbarSchema.inlineObjects.map((inlineObject) => (
                <InlineObjectButton
                  key={inlineObject.name}
                  schemaType={inlineObject}
                />
              ))}
            </Group>
          </>
        ) : null}
        <Group aria-label="Debugging">
          <FocusButton />
        </Group>
        <Separator orientation="vertical" />
        <Group aria-label="Extra">{props.children}</Group>
      </Toolbar>
      {toolbarSchema.annotations ? (
        <AnnotationPopover schemaTypes={toolbarSchema.annotations} />
      ) : null}
      {toolbarSchema.blockObjects ? (
        <BlockObjectPopover schemaTypes={toolbarSchema.blockObjects} />
      ) : null}
      {toolbarSchema.inlineObjects ? (
        <InlineObjectPopover schemaTypes={toolbarSchema.inlineObjects} />
      ) : null}
    </>
  )
}
