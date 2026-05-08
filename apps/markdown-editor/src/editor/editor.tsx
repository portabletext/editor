import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {
  ContainerPlugin,
  EventListenerPlugin,
  LeafPlugin,
} from '@portabletext/editor/plugins'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {useEffect, type RefObject} from 'react'
import {allContainers} from './containers'
import {allLeafs} from './leafs'
import {markdownShortcutsProps} from './markdown-shortcuts'
import {schemaDefinition} from './schema'

type Props = {
  initialValue: Array<PortableTextBlock>
  onMutation: (value: Array<PortableTextBlock>) => void
  onFocus: () => void
  replaceValueRef: RefObject<
    ((blocks: Array<PortableTextBlock>) => void) | null
  >
}

export function PortableTextSurface({
  initialValue,
  onMutation,
  onFocus,
  replaceValueRef,
}: Props) {
  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        initialValue,
      }}
    >
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'mutation') {
            onMutation(event.value ?? [])
          }
        }}
      />
      <ContainerPlugin containers={allContainers} />
      <LeafPlugin leafs={allLeafs} />
      <MarkdownShortcutsPlugin {...markdownShortcutsProps} />
      <ReplaceValueBridge replaceRef={replaceValueRef} />
      <PortableTextEditable
        onFocus={onFocus}
        className="prose prose-sm dark:prose-invert h-full max-w-none overflow-y-auto p-6 outline-none"
        renderStyle={(props) => {
          if (props.value === 'h1') {
            return (
              <h1 className="mt-4 mb-2 font-bold text-3xl">{props.children}</h1>
            )
          }
          if (props.value === 'h2') {
            return (
              <h2 className="mt-4 mb-2 font-bold text-2xl">{props.children}</h2>
            )
          }
          if (props.value === 'h3') {
            return (
              <h3 className="mt-3 mb-2 font-bold text-xl">{props.children}</h3>
            )
          }
          if (props.value === 'h4') {
            return (
              <h4 className="mt-3 mb-2 font-bold text-lg">{props.children}</h4>
            )
          }
          if (props.value === 'h5') {
            return (
              <h5 className="mt-2 mb-1 font-bold text-base">
                {props.children}
              </h5>
            )
          }
          if (props.value === 'h6') {
            return (
              <h6 className="mt-2 mb-1 font-bold text-sm uppercase tracking-wide">
                {props.children}
              </h6>
            )
          }
          return <p className="mb-2">{props.children}</p>
        }}
        renderDecorator={(props) => {
          if (props.value === 'strong') {
            return <strong>{props.children}</strong>
          }
          if (props.value === 'em') {
            return <em>{props.children}</em>
          }
          if (props.value === 'code') {
            return (
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
                {props.children}
              </code>
            )
          }
          if (props.value === 'strike-through') {
            return <s>{props.children}</s>
          }
          return props.children
        }}
        renderAnnotation={(props) => {
          if (props.schemaType.name === 'link') {
            const href = (props.value as {href?: string}).href
            return (
              <a
                href={href}
                className="text-blue-700 underline dark:text-blue-400"
              >
                {props.children}
              </a>
            )
          }
          return props.children
        }}
        renderPlaceholder={() => (
          <span className="text-gray-400 dark:text-gray-500">
            Start writing markdown
          </span>
        )}
      />
    </EditorProvider>
  )
}

function ReplaceValueBridge({
  replaceRef,
}: {
  replaceRef: RefObject<((blocks: Array<PortableTextBlock>) => void) | null>
}) {
  const editor = useEditor()
  useEffect(() => {
    replaceRef.current = (blocks) => {
      editor.send({type: 'update value', value: blocks})
    }
    return () => {
      replaceRef.current = null
    }
  }, [editor, replaceRef])
  return null
}
