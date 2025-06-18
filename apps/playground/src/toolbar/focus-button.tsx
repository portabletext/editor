import {useEditor, useEditorSelector} from '@portabletext/editor'
import {SquareDashedMousePointerIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Tooltip} from '../components/tooltip'

export function FocusButton() {
  const editor = useEditor()
  const readOnly = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <TooltipTrigger>
      <Button
        aria-label="Focus"
        variant="secondary"
        size="sm"
        isDisabled={readOnly}
        onPress={() => {
          editor.send({type: 'focus'})
        }}
      >
        <SquareDashedMousePointerIcon className="size-4" />
      </Button>
      <Tooltip>Focus</Tooltip>
    </TooltipTrigger>
  )
}
