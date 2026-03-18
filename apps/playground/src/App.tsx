import {PortableTextBlock} from '@portabletext/editor'
import {useActorRef} from '@xstate/react'
import {editorIdGenerator} from './editor-id-generator'
import {Editors} from './editors'
import {Footer} from './footer'
import {Header} from './header'
import {playgroundMachine} from './playground-machine'

const initialValue: Array<PortableTextBlock> = [
  {
    _type: 'table',
    _key: 'table-1',
    rows: [
      {
        _type: 'row',
        _key: 'row-1',
        cells: [
          {
            _type: 'cell',
            _key: 'cell-1',
            content: [
              {
                _type: 'block',
                _key: 'block-1',
                children: [
                  {
                    _type: 'span',
                    _key: 'span-1',
                    text: 'Hello, world!',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export function App() {
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {
      editorIdGenerator: editorIdGenerator(),
      initialValue,
    },
  })

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Header playgroundRef={playgroundRef} />
      <main className="flex-1 flex flex-col min-w-0">
        <Editors playgroundRef={playgroundRef} />
      </main>
      <Footer />
    </div>
  )
}
