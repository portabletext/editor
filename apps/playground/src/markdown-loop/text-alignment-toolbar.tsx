import {useEditor, useEditorSelector} from '@portabletext/editor'
import {getSelectedTextBlocks} from '@portabletext/editor/selectors'
import {AlignCenterIcon, AlignLeftIcon, AlignRightIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'

type TextAlignment = 'left' | 'center' | 'right'

const alignmentOptions: ReadonlyArray<{
  value: TextAlignment
  label: string
  icon: typeof AlignLeftIcon
}> = [
  {value: 'left', label: 'Align left', icon: AlignLeftIcon},
  {value: 'center', label: 'Align center', icon: AlignCenterIcon},
  {value: 'right', label: 'Align right', icon: AlignRightIcon},
]

export function TextAlignmentToolbar() {
  const editor = useEditor()
  const activeAlignment = useEditorSelector(editor, (snapshot) => {
    const alignment = (
      getSelectedTextBlocks(snapshot).at(0)?.node as
        | {alignment?: TextAlignment}
        | undefined
    )?.alignment
    return alignment ?? 'left'
  })

  return (
    <>
      {alignmentOptions.map((option) => (
        <TooltipTrigger key={option.value}>
          <ToggleButton
            aria-label={option.label}
            size="sm"
            isSelected={activeAlignment === option.value}
            onPress={() => {
              const blocks = getSelectedTextBlocks(editor.getSnapshot())
              for (const block of blocks) {
                if (option.value === 'left') {
                  editor.send({
                    type: 'block.unset',
                    at: block.path,
                    props: ['alignment'],
                  })
                } else {
                  editor.send({
                    type: 'block.set',
                    at: block.path,
                    props: {alignment: option.value},
                  })
                }
              }
            }}
          >
            <option.icon className="size-4" />
          </ToggleButton>
          <Tooltip>{option.label}</Tooltip>
        </TooltipTrigger>
      ))}
    </>
  )
}
