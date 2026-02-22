import {
  useEditor,
  useEditorSelector,
  type RangeDecoration,
} from '@portabletext/editor'
import {useMemo} from 'react'
import {
  BoldContent,
  CodeContent,
  ItalicContent,
  StrikethroughContent,
  SyntaxChars,
} from './decoration-components.tsx'
import {parseBlockText, type MarkdownRangeType} from './markdown-parser.ts'

const formatComponents: Record<
  MarkdownRangeType,
  (props: React.PropsWithChildren) => React.ReactElement
> = {
  strong: BoldContent,
  emphasis: ItalicContent,
  code: CodeContent,
  strikethrough: StrikethroughContent,
}

type BlockData = {
  key: string
  text: string
  spanKey: string
}

function blocksEqual(a: Array<BlockData>, b: Array<BlockData>): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let blockIndex = 0; blockIndex < a.length; blockIndex++) {
    if (
      a[blockIndex].key !== b[blockIndex].key ||
      a[blockIndex].text !== b[blockIndex].text ||
      a[blockIndex].spanKey !== b[blockIndex].spanKey
    ) {
      return false
    }
  }
  return true
}

/**
 * Hook that parses markdown syntax in editor blocks and returns
 * RangeDecorations for inline formatting and syntax character styling.
 *
 * Block-level formatting (headings) is handled separately by
 * useMarkdownBlockStyles which sets PT block style properties.
 */
export function useMarkdownDecorations(): Array<RangeDecoration> {
  const editor = useEditor()

  // Extract block keys and text content reactively
  const blocks = useEditorSelector(
    editor,
    (snapshot): Array<BlockData> => {
      return snapshot.context.value.map((block) => {
        if (!('children' in block) || !Array.isArray(block.children)) {
          return {key: block._key, text: '', spanKey: ''}
        }
        const firstSpan = block.children[0]
        const text =
          firstSpan && 'text' in firstSpan ? String(firstSpan.text) : ''
        const spanKey =
          firstSpan && '_key' in firstSpan ? String(firstSpan._key) : ''
        return {key: block._key, text, spanKey}
      })
    },
    blocksEqual,
  )

  // Parse all blocks and build decorations
  const decorations = useMemo(() => {
    const result: Array<RangeDecoration> = []

    for (const block of blocks) {
      if (!block.text || !block.spanKey) {
        continue
      }

      const parsed = parseBlockText(block.text)

      // Dim the heading syntax characters (# )
      if (parsed.headingSyntaxEnd > 0) {
        result.push({
          component: SyntaxChars,
          selection: {
            anchor: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: parsed.headingSyntaxEnd,
            },
          },
        })
      }

      // Inline format decorations
      for (const range of parsed.ranges) {
        const component = formatComponents[range.type]

        // Opening delimiter (e.g., **)
        result.push({
          component: SyntaxChars,
          selection: {
            anchor: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.from,
            },
            focus: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.textStart,
            },
          },
        })

        // Content (e.g., bold text)
        result.push({
          component,
          selection: {
            anchor: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.textStart,
            },
            focus: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.textEnd,
            },
          },
        })

        // Closing delimiter (e.g., **)
        result.push({
          component: SyntaxChars,
          selection: {
            anchor: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.textEnd,
            },
            focus: {
              path: [{_key: block.key}, 'children', {_key: block.spanKey}],
              offset: range.to,
            },
          },
        })
      }
    }

    return result
  }, [blocks])

  return decorations
}
