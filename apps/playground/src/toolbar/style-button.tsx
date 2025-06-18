import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TooltipTrigger} from 'react-aria-components'
import {Select, SelectItem} from '../components/select'
import {Tooltip} from '../components/tooltip'
import {Icon} from './icon'

export function StyleButton(props: {
  definitions: ReadonlyArray<{
    name: string
    title?: string
    icon?: React.ComponentType
  }>
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
