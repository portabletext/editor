import {useActorRef} from '@xstate/react'
import {editorIdGenerator} from './editor-id-generator'
import {Editors} from './editors'
import {Footer} from './footer'
import {Header} from './header'
import {HybridDebugPanel} from './hybrid-debug-panel'
import {playgroundMachine} from './playground-machine'

export function App() {
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  })

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header playgroundRef={playgroundRef} />
      <main className="flex-1 flex flex-col min-w-0">
        <Editors playgroundRef={playgroundRef} />
      </main>
      <Footer />
      <HybridDebugPanel />
    </div>
  )
}
