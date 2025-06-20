import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'
import type {ToolbarDecoratorDefinition} from './toolbar-schema-definition'

export function DecoratorButton(props: {
  definition: ToolbarDecoratorDefinition
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.definition.name),
  )

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.definition.title ?? props.definition.name}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={() => {
          editor.send({
            type: 'decorator.toggle',
            decorator: props.definition.name,
          })
          editor.send({type: 'focus'})
        }}
      >
        <Icon
          icon={props.definition.icon}
          fallback={props.definition.title ?? props.definition.name}
        />
      </ToggleButton>
      <Tooltip>{props.definition.title}</Tooltip>
    </TooltipTrigger>
  )
}
