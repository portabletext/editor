import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useHistoryButtons} from '@portabletext/toolbar'
import {Redo2Icon, Undo2Icon} from 'lucide-react'
import {Button} from '../primitives/button'
import {Group} from '../primitives/group'
import {ButtonTooltip} from './button-tooltip'

const historyShortcuts = {
  undo: createKeyboardShortcut({
    default: [
      {
        key: 'Z',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
    ],
    apple: [
      {
        key: 'Z',
        alt: false,
        ctrl: false,
        meta: true,
        shift: false,
      },
    ],
  }),
  redo: createKeyboardShortcut({
    default: [
      {
        key: 'Y',
        alt: false,
        ctrl: true,
        meta: false,
        shift: false,
      },
    ],
    apple: [
      {
        key: 'Z',
        alt: false,
        ctrl: false,
        meta: true,
        shift: true,
      },
    ],
  }),
}

export function HistoryButtons() {
  const {disabled, onUndo, onRedo} = useHistoryButtons()

  return (
    <Group aria-label="History">
      <ButtonTooltip label="Undo" shortcutKeys={historyShortcuts.undo.keys}>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={disabled}
          onPress={onUndo}
        >
          <Undo2Icon className="size-4" />
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Redo" shortcutKeys={historyShortcuts.redo.keys}>
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
