import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
} from '@portabletext/editor'
import {getTextBlockText, isTextBlock} from '@portabletext/editor/utils'
import {
  createTestKeyGenerator,
  fromTextspec,
  selectionFromTextspec,
  toTextspec,
} from '@portabletext/test'
import {useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {recordInput} from 'thumbjar/page'
import {gherkinSchemaDefinition} from '../../src/test/gherkin-schema'
import {reverseSelection} from '../../src/utils/util.reverse-selection'
import {getEditorSelection} from '../../test-utils/editor-selection'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
  getTextSelection,
} from '../../test-utils/text-selection'

const keyGenerator = createTestKeyGenerator()

function Probe() {
  const editor = useEditor()
  useEffect(() => {
    recordInput({
      getText: () => {
        const {context} = editor.getSnapshot()
        return context.value
          .map((block) =>
            isTextBlock(context, block) ? getTextBlockText(block) : '',
          )
          .join('\n')
      },
      getState: () => toTextspec(editor.getSnapshot().context),
      actions: {
        async state(args) {
          if (typeof args !== 'string') {
            throw new Error('state requires textspec')
          }
          const context = editor.getSnapshot().context
          const {blocks} = fromTextspec(context, args)
          editor.send({
            type: 'insert.blocks',
            blocks,
            placement: 'auto',
            select: 'end',
          })
          await rendered()
          const selection = selectionFromTextspec(
            context,
            args,
            editor.getSnapshot().context.value,
          )
          if (selection) {
            editor.send({type: 'select', at: selection})
          }
          await rendered()
        },
        async focus() {
          editor.send({type: 'focus'})
          await rendered()
        },
        async before(args) {
          if (typeof args !== 'string') {
            throw new Error('before requires text')
          }
          editor.send({
            type: 'select',
            at: getSelectionBeforeText(editor.getSnapshot().context, args),
          })
          await rendered()
        },
        async after(args) {
          if (typeof args !== 'string') {
            throw new Error('after requires text')
          }
          editor.send({
            type: 'select',
            at: getSelectionAfterText(editor.getSnapshot().context, args),
          })
          await rendered()
        },
        async selection(args) {
          if (typeof args !== 'string') {
            throw new Error('selection requires textspec')
          }
          const context = editor.getSnapshot().context
          const selection = selectionFromTextspec(context, args, context.value)
          if (!selection) {
            throw new Error(`Cannot resolve selection: ${args}`)
          }
          editor.send({type: 'select', at: selection})
          await rendered()
        },
        async select(args) {
          if (typeof args !== 'string') {
            throw new Error('select requires text')
          }
          editor.send({
            type: 'select',
            at: getTextSelection(editor.getSnapshot().context, args),
          })
          await rendered()
        },
        async all(args) {
          const selection = getEditorSelection(editor.getSnapshot().context)
          editor.send({
            type: 'select',
            at: args === 'backwards' ? reverseSelection(selection) : selection,
          })
          await rendered()
        },
        async insert(args) {
          if (typeof args !== 'string') {
            throw new Error('insert requires text')
          }
          editor.send({type: 'insert.text', text: args})
          await rendered()
        },
        async undo() {
          editor.send({type: 'history.undo'})
          await rendered()
        },
        async redo() {
          editor.send({type: 'history.redo'})
          await rendered()
        },
      },
    })
  }, [editor])
  return null
}

createRoot(document.getElementById('root')!).render(
  <EditorProvider
    initialConfig={{schemaDefinition: gherkinSchemaDefinition, keyGenerator}}
  >
    <PortableTextEditable
      style={{border: '1px solid #888', minHeight: '3em', fontSize: 20}}
    />
    <Probe />
  </EditorProvider>,
)

function rendered(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}
