import {useActorRef} from '@xstate/react'
import {editorIdGenerator} from './editor-id-generator'
import {Editors} from './editors'
import {playgroundMachine} from './playground-machine'

export function App() {
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  })

  return <Editors playgroundRef={playgroundRef} />
}
