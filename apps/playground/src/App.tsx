import {useActorRef} from '@xstate/react'
import {editorIdGenerator} from './editor-id-generator'
import {Editors} from './editors'
import {generateColor} from './generate-color'
import {playgroundMachine} from './playground-machine'

export function App() {
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {colorGenerator: generateColor('100'), editorIdGenerator: editorIdGenerator()},
  })

  return <Editors playgroundRef={playgroundRef} />
}
