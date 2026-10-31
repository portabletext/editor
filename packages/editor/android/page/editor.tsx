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

declare global {
  interface Window {
    __state: () => unknown
  }
}

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

const events: Array<Record<string, unknown>> = []

function Probe() {
  const editor = useEditor()
  useEffect(() => {
    window.__state = () => {
      const {context} = editor.getSnapshot()
      const text = (context.value ?? [])
        .map((block) =>
          isTextBlock(context, block) ? getTextBlockText(block) : '',
        )
        .join('\n')
      const dom = document.querySelector('[contenteditable]')?.textContent
      return {text, dom, events}
    }
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

const log = document.getElementById('log')!
for (const type of [
  'beforeinput',
  'input',
  'compositionstart',
  'compositionupdate',
  'compositionend',
]) {
  document.addEventListener(
    type,
    (event) => {
      events.push({
        type,
        inputType: event instanceof InputEvent ? event.inputType : undefined,
        data:
          event instanceof InputEvent || event instanceof CompositionEvent
            ? event.data
            : undefined,
      })
      log.textContent = events.map((entry) => JSON.stringify(entry)).join('\n')
    },
    true,
  )
}
