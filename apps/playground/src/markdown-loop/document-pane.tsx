import '@portabletext/plugin-table/ui/styles.css'
import '../editor.css'
import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type Editor,
  type EditorSchema,
  type PortableTextBlock,
} from '@portabletext/editor'
import {
  EditorRefPlugin,
  EventListenerPlugin,
  NodePlugin,
} from '@portabletext/editor/plugins'
import {ListIndexProvider} from '@portabletext/plugin-list-index'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {PasteLinkPlugin} from '@portabletext/plugin-paste-link'
import {
  createDecoratorGuard,
  TypographyPlugin,
} from '@portabletext/plugin-typography'
import {forwardRef} from 'react'
import {CalloutPlugin} from '../plugins/plugin.callout'
import {FactBoxPlugin} from '../plugins/plugin.fact-box'
import {InlineObjectsPlugin} from '../plugins/plugin.inline-objects'
import {markdownShortcutsPluginProps} from '../plugins/plugin.markdown'
import {PortableTextToolbar} from '../toolbar/portable-text-toolbar'
import type {MarkdownLoopPreset} from './presets'
import {
  annotationNode,
  blockObjectFallback,
  decoratorNode,
  markdownLoopTextBlock,
  renderPlaceholder,
} from './rendering'
import {TextAlignmentToolbar} from './text-alignment-toolbar'

const markdownLoopNodes = [
  markdownLoopTextBlock,
  blockObjectFallback,
  decoratorNode,
  annotationNode,
]

type DocumentPaneProps = {
  preset: MarkdownLoopPreset
  initialValue: Array<PortableTextBlock>
  keyGenerator: () => string
  onReady: (value: Array<PortableTextBlock>, schema: EditorSchema) => void
  onMutation: (value: Array<PortableTextBlock>) => void
  onInvalidValue: () => void
}

export const DocumentPane = forwardRef<Editor, DocumentPaneProps>(
  function DocumentPane(props, ref) {
    const TablePlugin = props.preset.tablePlugin
    return (
      <EditorProvider
        initialConfig={{
          initialValue: props.initialValue,
          keyGenerator: props.keyGenerator,
          schemaDefinition: props.preset.schemaDefinition,
        }}
      >
        <DocumentPaneBridge
          ref={ref}
          onReady={props.onReady}
          onMutation={props.onMutation}
          onInvalidValue={props.onInvalidValue}
        />
        <div className="mb-2">
          <PortableTextToolbar>
            <TextAlignmentToolbar />
          </PortableTextToolbar>
        </div>
        <ListIndexProvider>
          <NodePlugin nodes={markdownLoopNodes} />
          <CalloutPlugin />
          <FactBoxPlugin />
          {TablePlugin ? <TablePlugin /> : null}
          <InlineObjectsPlugin />
          <MarkdownShortcutsPlugin {...markdownShortcutsPluginProps} />
          <PasteLinkPlugin />
          <TypographyPlugin
            guard={createDecoratorGuard({
              decorators: ({context}) =>
                context.schema.decorators.flatMap((decorator) =>
                  decorator.name === 'code' ? [] : [decorator.name],
                ),
            })}
          />
          <PortableTextEditable
            className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 outline-none px-3 py-2 overflow-auto"
            renderPlaceholder={renderPlaceholder}
          />
        </ListIndexProvider>
      </EditorProvider>
    )
  },
)

const DocumentPaneBridge = forwardRef<
  Editor,
  {
    onReady: (value: Array<PortableTextBlock>, schema: EditorSchema) => void
    onMutation: (value: Array<PortableTextBlock>) => void
    onInvalidValue: () => void
  }
>(function DocumentPaneBridge(props, ref) {
  const editor = useEditor()

  return (
    <>
      <EditorRefPlugin ref={ref} />
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'ready') {
            const snapshot = editor.getSnapshot()
            props.onReady(snapshot.context.value, snapshot.context.schema)
          }
          if (event.type === 'mutation') {
            props.onMutation(event.value ?? [])
          }
          if (event.type === 'invalid value') {
            props.onInvalidValue()
          }
        }}
      />
    </>
  )
})
