import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
} from '@portabletext/editor'
import {getTextBlockText, isTextBlock} from '@portabletext/editor/utils'
import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {recordInput} from 'thumbjar/page'

const schemaDefinition = defineSchema({styles: [{name: 'normal'}]})

const params = new URLSearchParams(location.search)
const prefix = params.get('prefix') ?? ''

const keyGenerator = createTestKeyGenerator()

const initialValue = [
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text: prefix, marks: []}],
  },
]

function Probe() {
  const editor = useEditor()
  useEffect(() => {
    recordInput({
      getText: () => {
        const {context} = editor.getSnapshot()
        return (context.value ?? [])
          .map((block) =>
            isTextBlock(context, block) ? getTextBlockText(block) : '',
          )
          .join('\n')
      },
    })
  }, [editor])
  return null
}

function App() {
  return (
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue, keyGenerator}}
    >
      <Probe />
      <PortableTextEditable
        style={{border: '1px solid #888', minHeight: '3em', fontSize: 20}}
      />
    </EditorProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
