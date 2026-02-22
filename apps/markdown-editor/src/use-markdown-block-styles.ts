import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useEffect, useRef} from 'react'
import type {HeadingLevel} from './markdown-parser.ts'
import {parseBlockText} from './markdown-parser.ts'

type BlockStyleData = {
  key: string
  text: string
  currentStyle: string
}

function blockStyleDataEqual(
  a: Array<BlockStyleData>,
  b: Array<BlockStyleData>,
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let index = 0; index < a.length; index++) {
    if (
      a[index].key !== b[index].key ||
      a[index].text !== b[index].text ||
      a[index].currentStyle !== b[index].currentStyle
    ) {
      return false
    }
  }
  return true
}

const headingStyleMap: Record<HeadingLevel, string> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6',
}

/**
 * Syncs block styles based on markdown heading syntax.
 * When a block starts with `# `, sets style to 'h1', etc.
 * When heading syntax is removed, resets to 'normal'.
 *
 * Uses `block.set` with explicit path to avoid moving the cursor.
 */
export function useMarkdownBlockStyles() {
  const editor = useEditor()
  const isSyncing = useRef(false)

  const blockData = useEditorSelector(
    editor,
    (snapshot): Array<BlockStyleData> => {
      return snapshot.context.value.map((block) => {
        if (!('children' in block) || !Array.isArray(block.children)) {
          return {key: block._key, text: '', currentStyle: 'normal'}
        }
        const firstSpan = block.children[0]
        const text =
          firstSpan && 'text' in firstSpan ? String(firstSpan.text) : ''
        const currentStyle =
          'style' in block ? String(block.style ?? 'normal') : 'normal'
        return {key: block._key, text, currentStyle}
      })
    },
    blockStyleDataEqual,
  )

  useEffect(() => {
    // Prevent re-entrant style updates
    if (isSyncing.current) {
      return
    }

    let didUpdate = false

    for (const block of blockData) {
      const parsed = parseBlockText(block.text)
      const targetStyle = parsed.headingLevel
        ? headingStyleMap[parsed.headingLevel]
        : 'normal'

      if (block.currentStyle !== targetStyle) {
        if (!didUpdate) {
          isSyncing.current = true
          didUpdate = true
        }

        if (targetStyle === 'normal') {
          // Remove style by unsetting it
          editor.send({
            type: 'block.unset',
            at: [{_key: block.key}],
            props: ['style'],
          })
        } else {
          editor.send({
            type: 'block.set',
            at: [{_key: block.key}],
            props: {style: targetStyle},
          })
        }
      }
    }

    if (didUpdate) {
      isSyncing.current = false
    }
  }, [editor, blockData])
}
