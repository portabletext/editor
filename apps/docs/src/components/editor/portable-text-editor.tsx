import {
  EditorProvider,
  PortableTextEditable,
  type BlockRenderProps,
  type ChildRenderProps,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {TypographyPlugin} from '@portabletext/plugin-typography'
import {PortableText} from '@portabletext/react'
import {ActivityIcon, ImageIcon} from 'lucide-react'
import {useState} from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import {defaultSchema} from './defaultSchema'
import {initialValue as defaultInitialValue} from './initial-value'
import './editor.css'
import {PortableTextToolbar} from './toolbar/portable-text-toolbar'

type PortableTextEditorProps = {
  customSchema?: SchemaDefinition
}

export function PortableTextEditor({customSchema}: PortableTextEditorProps) {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    defaultInitialValue,
  )
  const schemaDefinition = customSchema || defaultSchema

  return (
    <div className="not-content w-full">
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: defaultInitialValue,
        }}
      >
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.value)
            }
          }}
        />
        <MarkdownShortcutsPlugin
          boldDecorator={({context}) =>
            context.schema.decorators.find((d) => d.name === 'strong')?.name
          }
          italicDecorator={({context}) =>
            context.schema.decorators.find((d) => d.name === 'em')?.name
          }
          defaultStyle={({context}) => context.schema.styles[0]?.name}
          headingStyle={({context, props}) =>
            context.schema.styles.find((s) => s.name === `h${props.level}`)
              ?.name
          }
          blockquoteStyle={({context}) =>
            context.schema.styles.find((s) => s.name === 'blockquote')?.name
          }
          unorderedList={({context}) =>
            context.schema.lists.find((l) => l.name === 'bullet')?.name
          }
          orderedList={({context}) =>
            context.schema.lists.find((l) => l.name === 'number')?.name
          }
          linkObject={({context, props}) => {
            const schemaType = context.schema.annotations.find(
              (a) => a.name === 'link',
            )
            const hrefField = schemaType?.fields.find(
              (f) => f.name === 'href' && f.type === 'string',
            )
            if (!schemaType || !hrefField) return undefined
            return {_type: schemaType.name, [hrefField.name]: props.href}
          }}
        />
        <TypographyPlugin />
        <div className="w-full mb-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-2 py-1 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
              <PortableTextToolbar />
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                @portabletext/editor
              </span>
            </div>
            <PortableTextEditable
              className="min-h-[200px] p-4 outline-none"
              renderBlock={(props: BlockRenderProps) => {
                if (props.schemaType.name === 'image') {
                  const value = props.value as {src?: string; alt?: string}
                  return (
                    <div
                      className={`my-2 p-2 border-2 rounded flex items-start gap-3 ${
                        props.selected
                          ? 'border-blue-400 dark:border-blue-500'
                          : 'border-gray-200 dark:border-gray-700'
                      } ${props.focused ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                    >
                      <div className="bg-gray-100 dark:bg-gray-800 size-16 flex items-center justify-center rounded overflow-hidden shrink-0">
                        {value.src ? (
                          <img
                            src={value.src}
                            alt={value.alt ?? ''}
                            className="object-cover max-w-full max-h-full"
                          />
                        ) : (
                          <ImageIcon className="size-6 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 text-sm">
                        <span className="truncate text-gray-600 dark:text-gray-300">
                          {value.src || 'No source'}
                        </span>
                        <span className="truncate text-gray-400 dark:text-gray-500 text-xs">
                          {value.alt || 'No alt text'}
                        </span>
                      </div>
                    </div>
                  )
                }
                return props.children
              }}
              renderChild={(props: ChildRenderProps) => {
                if (props.schemaType.name === 'stock-ticker') {
                  const value = props.value as {symbol?: string}
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-mono ${
                        props.selected
                          ? 'border-blue-400 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      } ${props.focused ? 'bg-blue-50 dark:bg-blue-950' : 'bg-gray-50 dark:bg-gray-800'}`}
                    >
                      <ActivityIcon className="size-3" />
                      {value.symbol || 'TICKER'}
                    </span>
                  )
                }
                return props.children
              }}
              renderListItem={(props) => props.children}
              renderStyle={(props) => {
                if (props.value === 'h1') {
                  return (
                    <h1 className="mb-1 font-bold text-3xl relative">
                      {props.children}
                    </h1>
                  )
                }
                if (props.value === 'h2') {
                  return (
                    <h2 className="mb-1 font-bold text-2xl relative">
                      {props.children}
                    </h2>
                  )
                }
                if (props.value === 'h3') {
                  return (
                    <h3 className="mb-1 font-bold text-xl relative">
                      {props.children}
                    </h3>
                  )
                }
                if (props.value === 'blockquote') {
                  return (
                    <blockquote className="mb-1 pl-2 py-1 border-gray-200 dark:border-gray-600 border-l-4 relative">
                      {props.children}
                    </blockquote>
                  )
                }
                return <p className="mb-1 relative">{props.children}</p>
              }}
              renderDecorator={(props) => {
                if (props.value === 'strong') {
                  return <strong>{props.children}</strong>
                }
                if (props.value === 'em') {
                  return <em>{props.children}</em>
                }
                if (props.value === 'underline') {
                  return <span className="underline">{props.children}</span>
                }
                return props.children
              }}
              renderAnnotation={(props) => {
                if (props.schemaType.name === 'link') {
                  const href = (props.value as {href?: string}).href
                  return (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-blue-700 dark:text-blue-400 underline">
                            {props.children}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="text-xs">{href || 'No URL'}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }
                return props.children
              }}
              renderPlaceholder={() => (
                <span className="text-gray-400 dark:text-gray-500">
                  Type something
                </span>
              )}
            />
          </div>
        </div>
      </EditorProvider>
      {value && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col max-h-96">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Rendered Output
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                via @portabletext/react
              </span>
            </div>
            <div className="p-4 prose prose-sm max-w-none flex-1 overflow-auto">
              <PortableText
                value={value}
                components={{
                  block: {
                    blockquote: ({children}) => (
                      <blockquote className="pl-3 py-1 border-l-4 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 italic">
                        {children}
                      </blockquote>
                    ),
                  },
                  types: {
                    'image': ({
                      value,
                    }: {
                      value: {src?: string; alt?: string}
                    }) => (
                      <div className="my-2">
                        {value.src ? (
                          <img
                            src={value.src}
                            alt={value.alt ?? ''}
                            className="max-w-full rounded"
                          />
                        ) : (
                          <div className="bg-gray-100 dark:bg-gray-800 p-4 text-gray-400 dark:text-gray-500">
                            No image source
                          </div>
                        )}
                      </div>
                    ),
                    'stock-ticker': ({value}: {value: {symbol?: string}}) => {
                      const symbol = value.symbol || 'TICKER'
                      const hash = symbol
                        .split('')
                        .reduce((a, c) => a + c.charCodeAt(0), 0)
                      const price = (
                        50 +
                        (hash % 200) +
                        (hash % 100) / 100
                      ).toFixed(2)
                      const change = ((hash % 10) - 4) / 2
                      const isUp = change >= 0
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono shadow-sm">
                          <span className="font-semibold">{symbol}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            ${price}
                          </span>
                          <span
                            className={
                              isUp
                                ? 'text-green-600 dark:text-green-500'
                                : 'text-red-600 dark:text-red-500'
                            }
                          >
                            {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                          </span>
                        </span>
                      )
                    },
                  },
                  marks: {
                    link: ({
                      children,
                      value,
                    }: {
                      children: React.ReactNode
                      value?: {href?: string}
                    }) => (
                      <a
                        href={value?.href}
                        className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  },
                }}
              />
            </div>
          </div>
          <div className="not-content border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col max-h-96">
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Portable Text JSON
              </span>
            </div>
            <pre className="p-4 text-xs overflow-auto bg-gray-900 text-gray-100 flex-1">
              <code>{JSON.stringify(value, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
