import type {EditorName, World} from '@portabletext/io/testing'
import {useState} from 'react'
import {
  applicableActions,
  applicableNetworkActions,
  editorPrompts,
} from './applicable'
import {DrawerView, OpenDetailsProvider, type Drawer} from './drawers'
import {EditorPanel} from './editor-panel'
import {FreePlayTab, useFreePlay} from './free-play-tab'
import {LinkPanel} from './link-panel'
import {ScenariosTab, useScenarioRunner} from './scenarios-tab'
import {ServerPanel} from './server-panel'
import {Button} from './ui'

type Tab = 'scenarios' | 'free play'

export function App() {
  const [tab, setTab] = useState<Tab>('scenarios')
  const [drawerState, setDrawerState] = useState<{
    world: World
    drawer: Drawer
  } | null>(null)
  const scenarioRunner = useScenarioRunner()
  const freePlay = useFreePlay()
  const world = tab === 'scenarios' ? scenarioRunner.world : freePlay.world
  const snapshot = world.snapshot()
  const drawer = drawerState?.world === world ? drawerState.drawer : null
  const setDrawer = (
    next: Drawer | null | ((current: Drawer | null) => Drawer | null),
  ) => {
    const resolved = typeof next === 'function' ? next(drawer) : next
    setDrawerState(resolved === null ? null : {world, drawer: resolved})
  }
  const network = applicableNetworkActions(snapshot)
  const promptsFor = (name: EditorName) => {
    const held = network.links[name].held

    return [
      ...editorPrompts(applicableActions(snapshot, name)),
      ...(held === undefined ? [] : [held]),
    ]
  }
  const [selection, setSelection] = useState<{
    world: World
    batchIds: Array<string>
  } | null>(null)
  const selectedBatchIds = selection?.world === world ? selection.batchIds : []
  const onStep =
    tab === 'free play'
      ? (text: string) => freePlay.perform('When', text)
      : undefined
  const onDeliver =
    tab === 'free play'
      ? (text: string) => freePlay.perform('When', text)
      : scenarioRunner.finished && !scenarioRunner.running
        ? scenarioRunner.deliver
        : undefined
  const saveRequests = snapshot.network?.saveRequests ?? []
  const selectedRequests = saveRequests.filter((request) =>
    selectedBatchIds.includes(request.batchId),
  )

  function toggleSelected(batchId: string) {
    setSelection({
      world,
      batchIds: selectedBatchIds.includes(batchId)
        ? selectedBatchIds.filter((candidate) => candidate !== batchId)
        : [
            ...selectedBatchIds.filter((candidate) =>
              saveRequests.some((request) => request.batchId === candidate),
            ),
            batchId,
          ],
    })
  }

  function receiveSelected() {
    const [first, second] = selectedRequests

    if (!first || !second || !onStep) {
      return
    }

    setSelection(null)
    onStep(
      `the server receives ${first.editor}'s batch ${first.batchNumber} and ${second.editor}'s batch ${second.batchNumber} as one transaction`,
    )
  }

  return (
    <OpenDetailsProvider
      value={(selection) => setDrawer({type: 'details', selection})}
    >
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-1.5">
          <h1 className="text-sm font-semibold">I/O protocol playground</h1>
          <p className="flex-1 text-xs text-gray-500">
            Two editors save to one server through a link each. Click any value,
            batch or transaction to look inside it.
          </p>
          <Button
            onClick={() =>
              setDrawer((current) =>
                current?.type === 'concepts' ? null : {type: 'concepts'},
              )
            }
          >
            Concepts
          </Button>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.25fr)] gap-2 p-2">
          <EditorPanel
            name="Editor A"
            editor={snapshot.editors?.['Editor A']}
            waitingCount={snapshot.network?.feeds['Editor A'].length ?? 0}
            prompts={promptsFor('Editor A')}
          />
          <LinkPanel
            name="Editor A"
            editorSide="left"
            editor={snapshot.editors?.['Editor A']}
            network={snapshot.network}
            applicability={network.links['Editor A']}
            onStep={onStep}
            onDeliver={onDeliver}
            selectedBatchIds={selectedBatchIds}
            onToggleSelected={toggleSelected}
          />
          <ServerPanel
            server={snapshot.server}
            now={snapshot.network?.now}
            advanceClock={network.advanceClock}
            onStep={onStep}
            selectedRequests={selectedRequests}
            onReceiveSelected={receiveSelected}
          />
          <LinkPanel
            name="Editor B"
            editorSide="right"
            editor={snapshot.editors?.['Editor B']}
            network={snapshot.network}
            applicability={network.links['Editor B']}
            onStep={onStep}
            onDeliver={onDeliver}
            selectedBatchIds={selectedBatchIds}
            onToggleSelected={toggleSelected}
          />
          <EditorPanel
            name="Editor B"
            editor={snapshot.editors?.['Editor B']}
            waitingCount={snapshot.network?.feeds['Editor B'].length ?? 0}
            prompts={promptsFor('Editor B')}
          />
        </main>

        <footer className="flex h-[40vh] flex-col border-t border-gray-300 bg-white">
          <nav className="flex gap-1 border-b border-gray-200 px-4 pt-2">
            {(['scenarios', 'free play'] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setTab(candidate)}
                className={`rounded-t px-3 py-1 text-sm capitalize ${
                  candidate === tab
                    ? 'border border-b-0 border-gray-300 bg-gray-50 font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {candidate}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            {tab === 'scenarios' ? (
              <ScenariosTab runner={scenarioRunner} />
            ) : (
              <FreePlayTab freePlay={freePlay} />
            )}
          </div>
        </footer>
      </div>

      {drawer ? (
        <DrawerView
          drawer={drawer}
          snapshot={snapshot}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </OpenDetailsProvider>
  )
}
