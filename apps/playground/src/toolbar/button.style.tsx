import type {ToolbarStyleSchemaType} from '@portabletext/toolbar'
import {useStyleSelector} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {Select, SelectItem} from '../primitives/select'
import {Tooltip} from '../primitives/tooltip'
import {KeyboardShortcutPreview} from './keyboard-shortcut-preview'

export function StyleButton(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const styleSelector = useStyleSelector(props)

  return (
    <TooltipTrigger>
      <Select
        isDisabled={styleSelector.snapshot.matches('disabled')}
        placeholder="Select style"
        aria-label="Style"
        selectedKey={styleSelector.snapshot.context.activeStyle ?? null}
        onSelectionChange={(style) => {
          if (typeof style === 'string') {
            styleSelector.send({type: 'toggle', style})
          }
        }}
      >
        {props.schemaTypes.map((schemaType) => (
          <SelectItem
            key={schemaType.name}
            id={schemaType.name}
            textValue={schemaType.title}
          >
            <Icon icon={schemaType.icon} fallback={null} />
            {schemaType.title}
            {schemaType.shortcut ? (
              <KeyboardShortcutPreview
                shortcut={schemaType.shortcut.keys}
                size="small"
              />
            ) : null}
          </SelectItem>
        ))}
      </Select>
      <Tooltip>Select style</Tooltip>
    </TooltipTrigger>
  )
}
