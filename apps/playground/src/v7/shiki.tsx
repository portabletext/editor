import type {RangeDecoration} from '@portabletext/editor'
import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useEffect, useMemo, useRef, useState} from 'react'
import type {BundledLanguage, BundledTheme, ThemedToken} from 'shiki/bundle/web'
import {codeToTokens} from 'shiki/bundle/web'
import {useTheme} from '../theme-context'

/**
 * Pure mapping from Shiki tokens to PTE `RangeDecoration` objects.
 *
 * Shiki emits a 2-D array of tokens (`ThemedToken[][]`), one inner array
 * per source line. Each token has `content`, an optional `color`, and an
 * `offset` relative to the original input. This function distributes the
 * tokens back across the corresponding line blocks in the deck's
 * `code-block` container so each token becomes a decoration over the
 * matching text span.
 *
 * Tokens without a colour or with empty content are skipped. Tokens whose
 * line index has no corresponding line key are dropped (parser produced
 * extra trailing lines).
 */
export function tokensToDecorations(
  tokens: ReadonlyArray<ReadonlyArray<ThemedToken>>,
  lineKeys: ReadonlyArray<string>,
  codeBlockKey: string,
): Array<RangeDecoration> {
  const decorations: Array<RangeDecoration> = []
  for (let lineIndex = 0; lineIndex < tokens.length; lineIndex++) {
    const lineTokens = tokens[lineIndex]
    const lineKey = lineKeys[lineIndex]
    if (!lineTokens || !lineKey) {
      continue
    }
    let column = 0
    for (const tok of lineTokens) {
      const length = tok.content.length
      const start = column
      const end = column + length
      column = end
      if (length === 0 || !tok.color) {
        continue
      }
      const color = tok.color
      decorations.push({
        component: ({children}) => <span style={{color}}>{children}</span>,
        selection: {
          anchor: {
            path: [
              {_key: codeBlockKey},
              'lines',
              {_key: lineKey},
              'children',
              0,
            ],
            offset: start,
          },
          focus: {
            path: [
              {_key: codeBlockKey},
              'lines',
              {_key: lineKey},
              'children',
              0,
            ],
            offset: end,
          },
        },
      })
    }
  }
  return decorations
}

type Line = {_key: string; children?: Array<{_type: string; text?: string}>}
type CodeBlock = {
  _key: string
  _type: 'code-block'
  language?: string
  lines?: Array<Line>
}
type Block = {_key: string; _type: string}

function isCodeBlock(block: unknown): block is CodeBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as Block)._type === 'code-block'
  )
}

function getLineText(line: Line): string {
  return (line.children ?? [])
    .map((child) => (child._type === 'span' ? (child.text ?? '') : ''))
    .join('')
}

/**
 * Returns the current Shiki `BundledLanguage` for the given deck code-block
 * language string. Unknown languages map to `text` (no highlighting).
 */
function normalizeLanguage(lang: string | undefined): BundledLanguage {
  if (!lang || lang === 'plain' || lang === 'text') {
    return 'text' as BundledLanguage
  }
  return lang as BundledLanguage
}

/**
 * Computes Shiki decorations for every `code-block` in the current editor
 * value. Tokenisation is async; while a fresh run is in flight the hook
 * returns the previous decorations so the editor does not flash
 * uncoloured.
 *
 * Cached per `(theme, language, source)` triple so unrelated edits don't
 * trigger re-tokenisation. The cache is bounded at 32 entries with
 * oldest-first eviction.
 *
 * Lifted from the pilcrow app verbatim - same trick, same trade-offs.
 */
export function useShikiDecorations(): ReadonlyArray<RangeDecoration> {
  const {resolvedTheme} = useTheme()
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const [decorations, setDecorations] = useState<
    ReadonlyArray<RangeDecoration>
  >([])
  const cacheRef = useRef<Map<string, Array<RangeDecoration>>>(new Map())

  const codeBlocks = useMemo(() => {
    if (!value) {
      return [] as Array<CodeBlock>
    }
    const out: Array<CodeBlock> = []
    const walk = (nodes: ReadonlyArray<unknown>) => {
      for (const node of nodes) {
        if (isCodeBlock(node)) {
          out.push(node)
          continue
        }
        if (node && typeof node === 'object') {
          for (const child of Object.values(node as Record<string, unknown>)) {
            if (Array.isArray(child)) {
              walk(child)
            }
          }
        }
      }
    }
    walk(value as ReadonlyArray<unknown>)
    return out
  }, [value])

  useEffect(() => {
    if (codeBlocks.length === 0) {
      setDecorations([])
      return
    }
    let cancelled = false
    const lightTheme: BundledTheme = 'github-light'
    const darkTheme: BundledTheme = 'github-dark'
    const activeTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme

    async function run() {
      const all: Array<RangeDecoration> = []
      for (const block of codeBlocks) {
        const lines = block.lines ?? []
        const lineKeys = lines.map((line) => line._key)
        const source = lines.map(getLineText).join('\n')
        const language = normalizeLanguage(block.language)
        const cacheKey = `${activeTheme}\x00${language}\x00${source}`
        const cached = cacheRef.current.get(cacheKey)
        if (cached) {
          all.push(...cached)
          continue
        }
        try {
          const result = await codeToTokens(source, {
            lang: language,
            theme: activeTheme,
          })
          const decorationsForBlock = tokensToDecorations(
            result.tokens,
            lineKeys,
            block._key,
          )
          // Cap cache at 32 entries; oldest first eviction.
          if (cacheRef.current.size >= 32) {
            const firstKey = cacheRef.current.keys().next().value
            if (firstKey !== undefined) {
              cacheRef.current.delete(firstKey)
            }
          }
          cacheRef.current.set(cacheKey, decorationsForBlock)
          all.push(...decorationsForBlock)
        } catch {
          // Unknown language or Shiki failure - leave the block unhighlighted.
        }
      }
      if (!cancelled) {
        setDecorations(all)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [codeBlocks, resolvedTheme])

  return decorations
}
