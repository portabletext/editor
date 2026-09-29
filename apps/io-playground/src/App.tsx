import {useState, type ReactNode} from 'react'
import {EditorPanel} from './editor-panel'
import {FreePlayTab, useFreePlay} from './free-play-tab'
import {NetworkPanel} from './network-panel'
import {ScenariosTab, useScenarioRunner} from './scenarios-tab'
import {ServerPanel} from './server-panel'

type Tab = 'scenarios' | 'free play'

export function App() {
  const [tab, setTab] = useState<Tab>('scenarios')
  const scenarioRunner = useScenarioRunner()
  const freePlay = useFreePlay()
  const world = tab === 'scenarios' ? scenarioRunner.world : freePlay.world
  const snapshot = world.snapshot()
  const onStep =
    tab === 'free play'
      ? (text: string) => freePlay.perform('When', text)
      : undefined

  return (
    <div className="flex h-screen flex-col">
      <main className="grid min-h-0 flex-1 grid-cols-3 gap-4 p-4">
        <Column>
          <EditorPanel
            name="Editor A"
            editor={snapshot.editors?.['Editor A']}
          />
        </Column>
        <Column>
          <ServerPanel server={snapshot.server} onStep={onStep} />
          <hr className="border-gray-200" />
          <NetworkPanel network={snapshot.network} onStep={onStep} />
        </Column>
        <Column>
          <EditorPanel
            name="Editor B"
            editor={snapshot.editors?.['Editor B']}
          />
        </Column>
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
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {tab === 'scenarios' ? (
            <ScenariosTab runner={scenarioRunner} />
          ) : (
            <FreePlayTab freePlay={freePlay} />
          )}
        </div>
      </footer>
    </div>
  )
}

function Column({children}: {children: ReactNode}) {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-auto rounded border border-gray-200 bg-gray-50 p-3">
      {children}
    </div>
  )
}
