import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TextCursorIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'

export function RangeDecorationButton(props: {
  onAddRangeDecoration: (rangeDecoration: RangeDecoration) => void
  onRangeDecorationMoved: (details: RangeDecorationOnMovedDetails) => void
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const selection = useEditorSelector(editor, selectors.getSelection)

  return (
    <TooltipTrigger>
      <Button
        aria-label="Decorate"
        isDisabled={!selection || disabled}
        variant="secondary"
        size="sm"
        onPress={() => {
          props.onAddRangeDecoration({
            component: RangeComponent,
            selection,
            onMoved: props.onRangeDecorationMoved,
          })
          editor.send({
            type: 'focus',
          })
        }}
      >
        <TextCursorIcon className="size-4" />
      </Button>
      <Tooltip>Add Range Decoration</Tooltip>
    </TooltipTrigger>
  )
}

function RangeComponent(props: React.PropsWithChildren<unknown>) {
  return (
    <span className="bg-green-200 border border-green-600">
      {props.children}
    </span>
  )
}
