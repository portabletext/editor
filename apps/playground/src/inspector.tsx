import {useActorRef, useSelector} from '@xstate/react'
import {
  ActivityIcon,
  CheckIcon,
  CopyIcon,
  GitBranchIcon,
  HistoryIcon,
  NetworkIcon,
  TrashIcon,
} from 'lucide-react'
import {useContext, useEffect, useState} from 'react'
import {TooltipTrigger, type Key} from 'react-aria-components'
import {PlaygroundFeatureFlagsContext} from './feature-flags'
import {highlightMachine} from './highlight-json-machine'
import {MarkdownLogo, PortableTextLogo, ReactLogo} from './logos'
import {PatchesList} from './patches-list'
import type {PlaygroundActorRef} from './playground-machine'
import {MarkdownPreview} from './previews/markdown-preview'
import {ReactPreview} from './previews/react-preview'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Spinner} from './primitives/spinner'
import {Tab, TabList, TabPanel, Tabs} from './primitives/tabs'
import {Tooltip} from './primitives/tooltip'
import {YjsCrdtPanel} from './yjs-crdt-panel'
import {YjsOperationLog} from './yjs-operation-log'
import {YjsTreeViewer} from './yjs-tree-viewer'

type TabId =
  | 'output'
  | 'patches'
  | 'react-preview'
  | 'markdown-preview'
  | 'yjs-tree'
  | 'yjs-ops'
  | 'yjs-crdt'

export function Inspector(props: {playgroundRef: PlaygroundActorRef}) {
  const [activeTab, setActiveTab] = useState<TabId>('output')
  const featureFlags = useContext(PlaygroundFeatureFlagsContext)

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
          {featureFlags.yjsMode ? (
            <Tab id="yjs-tree">
              <span className="flex items-center gap-1.5">
                <GitBranchIcon className="size-3" />
                <span className="hidden sm:inline">Y.Doc</span>
              </span>
            </Tab>
          ) : null}
          {featureFlags.yjsMode ? (
            <Tab id="yjs-ops">
              <span className="flex items-center gap-1.5">
                <NetworkIcon className="size-3" />
                <span className="hidden sm:inline">Ops</span>
              </span>
            </Tab>
          ) : null}
          {featureFlags.yjsMode ? (
            <Tab id="yjs-crdt">
              <span className="flex items-center gap-1.5">
                <ActivityIcon className="size-3" />
                <span className="hidden sm:inline">CRDT</span>
              </span>
            </Tab>
          ) : null}
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

      {featureFlags.yjsMode ? (
        <TabPanel id="yjs-tree" className="flex-1 min-h-0">
          <Container className="h-full overflow-clip">
            <YjsTreeViewer />
          </Container>
        </TabPanel>
      ) : null}

      {featureFlags.yjsMode ? (
        <TabPanel id="yjs-ops" className="flex-1 min-h-0">
          <Container className="h-full overflow-clip">
            <YjsOperationLog />
          </Container>
        </TabPanel>
      ) : null}

      {featureFlags.yjsMode ? (
        <TabPanel id="yjs-crdt" className="flex-1 min-h-0">
          <Container className="h-full overflow-clip">
            <YjsCrdtPanel />
          </Container>
        </TabPanel>
      ) : null}
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

function PatchesPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const patchFeed = useSelector(props.playgroundRef, (s) => s.context.patchFeed)
  const editorCount = useSelector(
    props.playgroundRef,
    (s) => s.context.editors.length,
  )

  return <PatchesList entries={patchFeed} showEditorLabel={editorCount > 1} />
}
