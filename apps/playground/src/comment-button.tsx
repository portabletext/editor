import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
} from '@portabletext/editor'
import {MessageSquarePlusIcon} from 'lucide-react'
import {useState} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import type {PlaygroundActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Dialog} from './primitives/dialog'
import {TextField} from './primitives/field.text'
import {Tooltip} from './primitives/tooltip'
import {getSelectionText} from './selection-text'

function isExpandedSelection(
  selection: EditorSelection,
): selection is NonNullable<EditorSelection> {
  return (
    selection !== null &&
    JSON.stringify(selection.anchor) !== JSON.stringify(selection.focus)
  )
}

export function CommentButton(props: {playgroundRef: PlaygroundActorRef}) {
  const editor = useEditor()
  const selection = useEditorSelector(editor, (s) => s.context.selection)
  const [range, setRange] = useState<NonNullable<EditorSelection> | null>(null)

  return (
    <Dialog
      title="Add comment"
      icon={MessageSquarePlusIcon}
      focusOnClose={() => {
        editor.send({type: 'focus'})
      }}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setRange(isExpandedSelection(selection) ? selection : null)
        }
      }}
      trigger={
        <TooltipTrigger>
          <Button
            aria-label="Add comment"
            isDisabled={!isExpandedSelection(selection)}
            variant="secondary"
            size="sm"
          >
            <MessageSquarePlusIcon className="size-4" />
          </Button>
          <Tooltip>Add comment</Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const text = String(formData.get('text') ?? '').trim()
            if (text.length > 0 && range) {
              const snapshot = editor.getSnapshot()
              const snapshotText = getSelectionText(
                snapshot.context,
                snapshot.context.value,
                range,
              )
              props.playgroundRef.send({
                type: 'add comment',
                text,
                range,
                snapshotText,
              })
            }
            close()
          }}
        >
          <TextField
            name="text"
            label="Comment"
            placeholder="Leave a comment on the selected text"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                close()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
