import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
} from '@portabletext/editor'
import {SpaceIcon, WrapTextIcon} from 'lucide-react'
import {useMemo} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'

const invisibleCharacterGlyphs = new Map<
  string,
  {glyph: string; zeroWidth: boolean}
>([
  ['\u00AD', {glyph: '¬', zeroWidth: true}],
  ['\u00A0', {glyph: '°', zeroWidth: false}],
])

const invisibleCharacterRegex = new RegExp(
  `[${[...invisibleCharacterGlyphs.keys()].join('')}]`,
  'g',
)

export function useInvisibleCharacterDecorations(): Array<RangeDecoration> {
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)

  return useMemo(() => {
    const decorations: Array<RangeDecoration> = []

    for (const block of value ?? []) {
      if (!Array.isArray(block.children)) {
        continue
      }

      for (const child of block.children) {
        if (typeof child.text !== 'string') {
          continue
        }

        for (const match of child.text.matchAll(invisibleCharacterRegex)) {
          const character = invisibleCharacterGlyphs.get(match[0])

          if (!character) {
            continue
          }

          const markerSide = character.zeroWidth
            ? match.index > 0
              ? ('start' as const)
              : ('end' as const)
            : null
          const path = [{_key: block._key}, 'children', {_key: child._key}]

          decorations.push({
            component: (props) => (
              <InvisibleCharacter
                glyph={character.glyph}
                markerSide={markerSide}
              >
                {props.children}
              </InvisibleCharacter>
            ),
            selection: {
              anchor: {path, offset: match.index},
              focus: {path, offset: match.index + 1},
            },
          })
        }
      }
    }

    return decorations
  }, [value])
}

function InvisibleCharacter(props: {
  glyph: string
  markerSide: 'start' | 'end' | null
  children?: React.ReactNode
}) {
  const wrapperPadding =
    props.markerSide === 'start'
      ? 'ps-[1ch]'
      : props.markerSide === 'end'
        ? 'pe-[1ch]'
        : ''
  const markerPosition =
    props.markerSide === 'start'
      ? 'start-0 w-[1ch]'
      : props.markerSide === 'end'
        ? 'end-0 w-[1ch]'
        : 'inset-x-0'

  return (
    <span
      className={`relative rounded-xs bg-sky-100 dark:bg-sky-900/50 ${wrapperPadding}`}
    >
      {props.children}
      <span
        contentEditable={false}
        className={`absolute inset-y-0 flex items-center justify-center text-sky-600 dark:text-sky-400 pointer-events-none select-none ${markerPosition}`}
      >
        {props.glyph}
      </span>
    </span>
  )
}

export function InsertInvisibleCharacterButtons() {
  return (
    <>
      <InsertInvisibleCharacterButton
        character={'\u00AD'}
        icon={<WrapTextIcon className="size-4" />}
        description="Insert soft hyphen"
      />
      <InsertInvisibleCharacterButton
        character={'\u00A0'}
        icon={<SpaceIcon className="size-4" />}
        description="Insert non-breaking space"
      />
    </>
  )
}

function InsertInvisibleCharacterButton(props: {
  character: string
  icon: React.ReactNode
  description: string
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly || !snapshot.context.selection,
  )

  return (
    <TooltipTrigger>
      <Button
        aria-label={props.description}
        isDisabled={disabled}
        variant="secondary"
        size="sm"
        onPress={() => {
          editor.send({type: 'insert.text', text: props.character})
          editor.send({type: 'focus'})
        }}
      >
        {props.icon}
      </Button>
      <Tooltip>{props.description}</Tooltip>
    </TooltipTrigger>
  )
}
