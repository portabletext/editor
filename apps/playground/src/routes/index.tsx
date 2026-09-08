import {createFileRoute} from '@tanstack/react-router'
import {useActorRef} from '@xstate/react'
import {editorIdGenerator} from '../editor-id-generator'
import {Editors} from '../editors'
import {Header} from '../header'
import {playgroundMachine} from '../playground-machine'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
    },
  })

  return (
    <>
      <Header playgroundRef={playgroundRef} />
      <main className="flex-1 flex flex-col min-w-0">
        <Editors playgroundRef={playgroundRef} />
      </main>
    </>
  )
}
