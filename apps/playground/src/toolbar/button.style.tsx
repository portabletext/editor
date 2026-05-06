import type {ToolbarStyleSchemaType} from '@portabletext/toolbar'
import {useApplicableSchema, useStyleSelector} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {Select, SelectItem} from '../primitives/select'
import {Tooltip} from '../primitives/tooltip'
import {KeyboardShortcutPreview} from './keyboard-shortcut-preview'

export function StyleButton(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const styleSelector = useStyleSelector(props)
  const applicable = useApplicableSchema()
  const activeStyle = styleSelector.snapshot.context.activeStyle ?? 'normal'
  const disabledKeys = props.schemaTypes
    .filter((schemaType) => !applicable.styles.has(schemaType.name))
    .map((schemaType) => schemaType.name)

  return (
    <TooltipTrigger>
      <Select
        isDisabled={styleSelector.snapshot.matches('disabled')}
        disabledKeys={disabledKeys}
        placeholder="Select style"
        aria-label="Style"
        selectedKey={activeStyle}
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
