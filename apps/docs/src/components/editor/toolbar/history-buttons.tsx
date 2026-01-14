import {Button} from '@/components/ui/button'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useHistoryButtons} from '@portabletext/toolbar'
import {Redo2Icon, Undo2Icon} from 'lucide-react'
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
  const {snapshot, send} = useHistoryButtons()

  return (
    <div className="flex items-center gap-0.5">
      <ButtonTooltip label="Undo" shortcutKeys={historyShortcuts.undo.keys}>
        <Button
          aria-label="Undo"
          variant="ghost"
          size="icon-sm"
          disabled={snapshot.matches('disabled')}
          onClick={() => {
            send({type: 'history.undo'})
          }}
        >
          <Undo2Icon className="size-4" />
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Redo" shortcutKeys={historyShortcuts.redo.keys}>
        <Button
          aria-label="Redo"
          variant="ghost"
          size="icon-sm"
          disabled={snapshot.matches('disabled')}
          onClick={() => {
            send({type: 'history.redo'})
          }}
        >
          <Redo2Icon className="size-4" />
        </Button>
      </ButtonTooltip>
    </div>
  )
}
