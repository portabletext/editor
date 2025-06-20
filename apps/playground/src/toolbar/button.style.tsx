import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {Select, SelectItem} from '../primitives/select'
import {Tooltip} from '../primitives/tooltip'
import type {ToolbarStyleDefinition} from './toolbar-schema-definition'

export function StyleButton(props: {
  definitions: ReadonlyArray<ToolbarStyleDefinition>
}) {
  const editor = useEditor()
  const activeStyle = useEditorSelector(editor, selectors.getActiveStyle)
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <TooltipTrigger>
      <Select
        isDisabled={disabled}
        placeholder="Select style"
        aria-label="Style"
        selectedKey={activeStyle ?? null}
        onSelectionChange={(style) => {
          if (typeof style === 'string') {
            editor.send({type: 'style.toggle', style})
            editor.send({type: 'focus'})
          }
        }}
      >
        {props.definitions.map((definition) => (
          <SelectItem
            key={definition.name}
            id={definition.name}
            textValue={definition.title}
          >
            <Icon icon={definition.icon} fallback={null} />
            {definition.title}
          </SelectItem>
        ))}
      </Select>
      <Tooltip>Select style</Tooltip>
    </TooltipTrigger>
  )
}
