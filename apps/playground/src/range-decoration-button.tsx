import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
  type PortableTextBlock,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
} from '@portabletext/editor'
import {TextCursorIcon} from 'lucide-react'
import {useCallback, useRef} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'

/**
 * Extract the plain text covered by a selection from the editor value.
 */
function getSelectedText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection | null,
): string {
  if (!value || !selection) return ''

  const anchorKey =
    selection.anchor.path[0] &&
    typeof selection.anchor.path[0] === 'object' &&
    '_key' in selection.anchor.path[0]
      ? selection.anchor.path[0]._key
      : undefined
  const focusKey =
    selection.focus.path[0] &&
    typeof selection.focus.path[0] === 'object' &&
    '_key' in selection.focus.path[0]
      ? selection.focus.path[0]._key
      : undefined

  if (!anchorKey || !focusKey || anchorKey !== focusKey) {
    // Cross-block selection — just grab the anchor block text for simplicity
    const block = value.find(
      (b) => '_key' in b && b._key === anchorKey,
    ) as PortableTextBlock & {children?: Array<{text?: string}>}
    if (!block?.children) return ''
    const fullText = block.children.map((c) => c.text ?? '').join('')
    return fullText.slice(selection.anchor.offset, fullText.length)
  }

  // Same block — extract text between anchor and focus offsets
  const block = value.find(
    (b) => '_key' in b && b._key === anchorKey,
  ) as PortableTextBlock & {children?: Array<{text?: string}>}
  if (!block?.children) return ''
  const fullText = block.children.map((c) => c.text ?? '').join('')
  const start = Math.min(selection.anchor.offset, selection.focus.offset)
  const end = Math.max(selection.anchor.offset, selection.focus.offset)
  return fullText.slice(start, end)
}

/**
 * Search the document for `text` and return an EditorSelection spanning it.
 * Returns null if not found.
 */
function findTextInDocument(
  value: Array<PortableTextBlock> | undefined,
  text: string,
): EditorSelection | null {
  if (!value || !text) return null

  for (const block of value) {
    if (!('children' in block) || !Array.isArray(block.children)) continue
    const children = block.children as Array<{
      _key: string
      _type: string
      text?: string
    }>

    // Build the full text of this block and track child boundaries
    let fullText = ''
    const childBoundaries: Array<{key: string; start: number; end: number}> = []
    for (const child of children) {
      const childText = child.text ?? ''
      childBoundaries.push({
        key: child._key,
        start: fullText.length,
        end: fullText.length + childText.length,
      })
      fullText += childText
    }

    const idx = fullText.indexOf(text)
    if (idx === -1) continue

    const startOffset = idx
    const endOffset = idx + text.length

    // Find which child contains the start and end
    const startChild = childBoundaries.find(
      (c) => startOffset >= c.start && startOffset <= c.end,
    )
    const endChild = childBoundaries.find(
      (c) => endOffset >= c.start && endOffset <= c.end,
    )
    if (!startChild || !endChild) continue

    return {
      anchor: {
        path: [{_key: block._key}, 'children', {_key: startChild.key}],
        offset: startOffset - startChild.start,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: endChild.key}],
        offset: endOffset - endChild.start,
      },
    }
  }

  return null
}

export function RangeDecorationButton(props: {
  onAddRangeDecoration: (rangeDecoration: RangeDecoration) => void
  onRangeDecorationMoved: (details: RangeDecorationOnMovedDetails) => void
  remoteFixUp: boolean
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly || !snapshot.context.selection,
  )

  // Use refs so the onMoved closure always reads current values
  const remoteFixUpRef = useRef(props.remoteFixUp)
  remoteFixUpRef.current = props.remoteFixUp

  const onPress = useCallback(() => {
    const snapshot = editor.getSnapshot()
    const selection = snapshot.context.selection
    const value = snapshot.context.value

    // Capture the text under the selection at creation time
    const originalText = getSelectedText(value, selection)

    props.onAddRangeDecoration({
      component: RangeComponent,
      selection,
      payload: {originalText},
      onMoved: (details) => {
        // Always notify parent for state management
        props.onRangeDecorationMoved(details)

        // If fix-up is enabled and this is a remote op, try to re-resolve
        if (
          remoteFixUpRef.current &&
          details.origin === 'remote' &&
          details.newSelection !== null
        ) {
          const currentValue = editor.getSnapshot().context.value
          const storedText = details.rangeDecoration.payload?.originalText as
            | string
            | undefined
          if (storedText) {
            const resolved = findTextInDocument(currentValue, storedText)
            if (resolved) {
              return resolved
            }
          }
        }
      },
    })
    editor.send({
      type: 'focus',
    })
  }, [editor, props])

  return (
    <TooltipTrigger>
      <Button
        aria-label="Decorate"
        isDisabled={disabled}
        variant="secondary"
        size="sm"
        onPress={onPress}
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
