import {
  useRangeDecorations,
  type RangeDecorationLayer,
} from '@portabletext/plugin-range-decorations'
import {useActorRef, useSelector} from '@xstate/react'
import {
  CheckIcon,
  CopyIcon,
  HistoryIcon,
  LayersIcon,
  MessageSquareTextIcon,
  TrashIcon,
} from 'lucide-react'
import {useEffect, useState} from 'react'
import {TooltipTrigger, type Key} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {highlightMachine} from './highlight-json-machine'
import {MarkdownLogo, PortableTextLogo, ReactLogo} from './logos'
import {PatchesList} from './patches-list'
import type {
  PlaygroundActorRef,
  RangeDecorationLayerKind,
} from './playground-machine'
import {formatRange} from './plugins/plugin.comments'
import {getCaretColor} from './plugins/plugin.presence'
import {MarkdownPreview} from './previews/markdown-preview'
import {ReactPreview} from './previews/react-preview'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Spinner} from './primitives/spinner'
import {Tab, TabList, TabPanel, Tabs} from './primitives/tabs'
import {Tooltip} from './primitives/tooltip'

type TabId =
  | 'output'
  | 'patches'
  | 'react-preview'
  | 'markdown-preview'
  | 'comments'
  | 'decorations'

export function Inspector(props: {playgroundRef: PlaygroundActorRef}) {
  const [activeTab, setActiveTab] = useState<TabId>('output')

  const handleTabChange = (key: Key) => {
    setActiveTab(key as TabId)
  }

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={handleTabChange}
      className="flex flex-col h-full min-h-0"
    >
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <TabList>
          <Tab id="output">
            <span className="flex items-center gap-1.5">
              <PortableTextLogo className="size-3" />
              <span className="hidden sm:inline">Portable Text</span>
            </span>
          </Tab>
          <Tab id="patches">
            <span className="flex items-center gap-1.5">
              <HistoryIcon className="size-3" />
              <span className="hidden sm:inline">Patches</span>
            </span>
          </Tab>
          <Tab id="react-preview">
            <span className="flex items-center gap-1.5">
              <ReactLogo className="size-3" />
              <span className="hidden sm:inline">React</span>
            </span>
          </Tab>
          <Tab id="markdown-preview">
            <span className="flex items-center gap-1.5">
              <MarkdownLogo className="size-3" />
              <span className="hidden sm:inline">Markdown</span>
            </span>
          </Tab>
          <Tab id="comments">
            <span className="flex items-center gap-1.5">
              <MessageSquareTextIcon className="size-3" />
              <span className="hidden sm:inline">Comments</span>
            </span>
          </Tab>
          <Tab id="decorations">
            <span className="flex items-center gap-1.5">
              <LayersIcon className="size-3" />
              <span className="hidden sm:inline">Decorations</span>
            </span>
          </Tab>
        </TabList>
        <TabActions activeTab={activeTab} playgroundRef={props.playgroundRef} />
      </div>

      <TabPanel id="output" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <OutputPanel playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>

      <TabPanel id="patches" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <PatchesPanel playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>

      <TabPanel id="react-preview" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <ReactPreview playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>

      <TabPanel id="markdown-preview" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <MarkdownPreview playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>

      <TabPanel id="comments" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <CommentsPanel playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>

      <TabPanel id="decorations" className="flex-1 min-h-0">
        <Container className="h-full overflow-clip">
          <DecorationsPanel playgroundRef={props.playgroundRef} />
        </Container>
      </TabPanel>
    </Tabs>
  )
}

function TabActions(props: {
  activeTab: TabId
  playgroundRef: PlaygroundActorRef
}) {
  const {activeTab, playgroundRef} = props
  const isCopied = useSelector(playgroundRef, (s) =>
    s.matches({'copying value': 'copied'}),
  )
  const isCopyingPatches = useSelector(playgroundRef, (s) =>
    s.matches({'copying patches': 'copied'}),
  )
  const isCopyingMarkdown = useSelector(playgroundRef, (s) =>
    s.matches({'copying markdown': 'copied'}),
  )

  if (activeTab === 'output') {
    return (
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => playgroundRef.send({type: 'copy value'})}
        >
          {isCopied ? (
            <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
          ) : (
            <CopyIcon className="size-3" />
          )}
        </Button>
        <Tooltip>{isCopied ? 'Copied!' : 'Copy to clipboard'}</Tooltip>
      </TooltipTrigger>
    )
  }

  if (activeTab === 'patches') {
    return (
      <div className="flex items-center gap-1">
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => playgroundRef.send({type: 'copy patches'})}
          >
            {isCopyingPatches ? (
              <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
            ) : (
              <CopyIcon className="size-3" />
            )}
          </Button>
          <Tooltip>{isCopyingPatches ? 'Copied!' : 'Copy patches'}</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => playgroundRef.send({type: 'clear patches'})}
          >
            <TrashIcon className="size-3" />
          </Button>
          <Tooltip>Clear patches</Tooltip>
        </TooltipTrigger>
      </div>
    )
  }

  if (activeTab === 'markdown-preview') {
    return (
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => playgroundRef.send({type: 'copy markdown'})}
        >
          {isCopyingMarkdown ? (
            <CheckIcon className="size-3 text-green-600 dark:text-green-400" />
          ) : (
            <CopyIcon className="size-3" />
          )}
        </Button>
        <Tooltip>{isCopyingMarkdown ? 'Copied!' : 'Copy markdown'}</Tooltip>
      </TooltipTrigger>
    )
  }

  return null
}

function OutputPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const value = useSelector(
    props.playgroundRef,
    (s) => s.context.patchDerivedValue,
  )
  const highlightRef = useActorRef(highlightMachine, {
    input: {
      code: JSON.stringify(value ?? null),
      variant: 'default',
    },
  })
  const highlightedCode = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )

  useEffect(() => {
    const subscription = props.playgroundRef.subscribe((s) => {
      highlightRef.send({
        type: 'update code',
        code: JSON.stringify(s.context.patchDerivedValue ?? null),
      })
    })
    return () => subscription.unsubscribe()
  }, [props.playgroundRef, highlightRef])

  if (!highlightedCode) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  if (!value || value.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <PortableTextLogo className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No content yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see the output
        </p>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-y-auto [&>pre]:max-h-none"
      dangerouslySetInnerHTML={{__html: highlightedCode}}
    />
  )
}

const commentBadgeStyle = tv({
  base: 'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium not-italic',
  variants: {
    kind: {
      edited:
        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      orphaned: 'bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400',
    },
  },
})

function CommentsPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const comments = useSelector(props.playgroundRef, (s) => s.context.comments)

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <MessageSquareTextIcon className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No comments yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Select text and add a comment to see it here
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto">
      {comments.map((comment) => {
        const isEdited =
          comment.currentText !== undefined &&
          comment.snapshotText !== undefined &&
          comment.currentText !== comment.snapshotText

        return (
          <div
            key={comment.id}
            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2"
          >
            <div className="min-w-0 flex-1">
              <div
                className={`truncate text-xs font-medium ${
                  comment.status === 'orphaned'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {comment.text}
              </div>
              <div className="mt-1 flex flex-col">
                {comment.currentText !== undefined ? (
                  <div className="flex items-center gap-1.5 truncate text-xs italic text-gray-400 dark:text-gray-500">
                    <span className="truncate">"{comment.currentText}"</span>
                    {isEdited ? (
                      <span className={commentBadgeStyle({kind: 'edited'})}>
                        edited
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {formatRange(comment.range)}
                  </span>
                  {comment.status === 'orphaned' ? (
                    <span className={commentBadgeStyle({kind: 'orphaned'})}>
                      Orphaned
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <TooltipTrigger>
              <Button
                aria-label="Remove comment"
                variant="ghost"
                size="sm"
                onPress={() =>
                  props.playgroundRef.send({
                    type: 'remove comment',
                    id: comment.id,
                  })
                }
              >
                <TrashIcon className="size-3" />
              </Button>
              <Tooltip>Remove comment</Tooltip>
            </TooltipTrigger>
          </div>
        )
      })}
    </div>
  )
}

const LAYER_KINDS: ReadonlyArray<RangeDecorationLayerKind> = [
  'comments',
  'presence',
]

function DecorationsPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)
  const layers = useSelector(props.playgroundRef, (s) => s.context.layers)

  if (editors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <LayersIcon className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No editors yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Add an editor to see its decorations
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {editors.map((editor) => (
        <div key={editor.id} className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {editor.id}
          </div>
          {LAYER_KINDS.map((kind) => {
            const layer = layers[editor.id]?.[kind]
            return layer ? (
              <LayerPositions key={kind} kind={kind} layer={layer} />
            ) : null
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * One `useRangeDecorations` call per layer entry, in its own component:
 * the panel maps over a dynamic editor/layer list, and hooks cannot be
 * called from inside a loop.
 */
function LayerPositions(props: {
  kind: RangeDecorationLayerKind
  layer: RangeDecorationLayer
}) {
  const positions = useRangeDecorations(props.layer)

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {props.kind}
      </div>
      {positions.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No live decorations
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {positions.map((position) => (
            <li key={position.id} className="flex items-center gap-1.5">
              {props.kind === 'presence' ? (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{backgroundColor: getCaretColor(position.id)}}
                />
              ) : null}
              <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {position.id}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-mono text-gray-400 dark:text-gray-500">
                {formatRange(position.range)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PatchesPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const patchFeed = useSelector(props.playgroundRef, (s) => s.context.patchFeed)
  const editorCount = useSelector(
    props.playgroundRef,
    (s) => s.context.editors.length,
  )

  return <PatchesList entries={patchFeed} showEditorLabel={editorCount > 1} />
}
