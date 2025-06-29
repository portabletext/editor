import {IS_APPLE, useHistoryButtons} from '@portabletext/toolbar'
import {Redo2Icon, Undo2Icon} from 'lucide-react'
import {Button} from '../primitives/button'
import {Group} from '../primitives/group'
import {ButtonTooltip} from './button-tooltip'

export function HistoryButtons() {
  const {disabled, onUndo, onRedo} = useHistoryButtons()

  return (
    <Group aria-label="History">
      <ButtonTooltip
        label="Undo"
        shortcut={IS_APPLE ? ['⌘', 'Z'] : ['Ctrl', 'Z']}
      >
        <Button
          variant="secondary"
          size="sm"
          isDisabled={disabled}
          onPress={onUndo}
        >
          <Undo2Icon className="size-4" />
        </Button>
      </ButtonTooltip>
      <ButtonTooltip
        label="Redo"
        shortcut={IS_APPLE ? ['Shift', '⌘', 'Z'] : ['Ctrl', 'Y']}
      >
        <Button
          variant="secondary"
          size="sm"
          isDisabled={disabled}
          onPress={onRedo}
        >
          <Redo2Icon className="size-4" />
        </Button>
      </ButtonTooltip>
    </Group>
  )
}
