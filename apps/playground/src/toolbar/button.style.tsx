import type {ToolbarStyleDefinition} from '@portabletext/toolbar'
import {useStyleSelector} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {Select, SelectItem} from '../primitives/select'
import {Tooltip} from '../primitives/tooltip'
import {KeyboardShortcutPreview} from './keyboard-shortcut-preview'

export function StyleButton(props: {
  definitions: ReadonlyArray<ToolbarStyleDefinition>
}) {
  const {activeStyle, disabled, onToggle} = useStyleSelector(props)

  return (
    <TooltipTrigger>
      <Select
        isDisabled={disabled}
        placeholder="Select style"
        aria-label="Style"
        selectedKey={activeStyle ?? null}
        onSelectionChange={(style) => {
          if (typeof style === 'string') {
            onToggle(style)
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
            {definition.shortcut ? (
              <KeyboardShortcutPreview
                shortcut={definition.shortcut.keys}
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
