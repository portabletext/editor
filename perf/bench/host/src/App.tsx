import {
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
  type Path,
  type TextBlockRenderProps,
} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {cloneElement, useEffect, useMemo, type ReactElement} from 'react'
import {getScenario} from '../../scenarios'

export function App() {
  const scenarioName = useMemo(
    () =>
      new URLSearchParams(window.location.search).get('scenario') ?? 'plain',
    [],
  )
  const scenario = useMemo(() => getScenario(scenarioName), [scenarioName])

  const keyToBlockIndex = useMemo(() => {
    const map = new Map<string, number>()
    scenario.initialValue.forEach((block, index) => {
      map.set(block._key, index)
    })
    return map
  }, [scenario])

  const nodes = useMemo(
    () => [createIndexedTextBlockNode(keyToBlockIndex)],
    [keyToBlockIndex],
  )

  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition: scenario.schemaDefinition,
        initialValue: scenario.initialValue,
      }}
    >
      <ReadinessMarker expectedBlockCount={scenario.initialValue.length} />
      <NodePlugin nodes={nodes} />
      <PortableTextEditable />
    </EditorProvider>
  )
}

/**
 * Marks the host ready for the runner once every block of the scenario's
 * initial value has reached the DOM and a paint has settled. The editor
 * streams a fresh initial value in over multiple event-loop turns (10
 * blocks per turn — see `sync-machine.ts`'s `getStreamedBlocks`), so
 * readiness waits for every block to land, then for a settled paint.
 */
function ReadinessMarker({expectedBlockCount}: {expectedBlockCount: number}) {
  useEffect(() => {
    let cancelled = false
    const pollForFullRender = () => {
      if (cancelled) return
      const renderedBlockCount =
        document.querySelectorAll('[data-block-index]').length
      if (renderedBlockCount < expectedBlockCount) {
        requestAnimationFrame(pollForFullRender)
        return
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) document.body.setAttribute('data-bench-ready', 'true')
        })
      })
    }
    requestAnimationFrame(pollForFullRender)
    return () => {
      cancelled = true
    }
  }, [expectedBlockCount])
  return null
}

/**
 * Stamps every top-level text block with `data-block-index`, so the runner
 * can locate a scenario's caret target (`{blockIndex, position}`) purely
 * from the DOM, without depending on generated `_key`s.
 */
function createIndexedTextBlockNode(keyToBlockIndex: Map<string, number>) {
  return defineTextBlock({
    type: 'block',
    render: (props: TextBlockRenderProps) => {
      const blockIndex = keyToBlockIndex.get(getBlockKey(props.path))
      return cloneElement(
        props.renderDefault(props) as ReactElement<Record<string, unknown>>,
        {
          'data-block-index': blockIndex,
        },
      )
    },
  })
}

function getBlockKey(path: Path): string {
  const firstSegment = path[0]
  if (typeof firstSegment === 'object' && '_key' in firstSegment) {
    return firstSegment._key
  }
  throw new Error(
    'expected the first path segment of a text block to carry a _key',
  )
}
