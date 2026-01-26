import {useEditor, type EditorSelection} from '@portabletext/editor'
import {defineBehavior, effect, raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'
import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import Fuse from 'fuse.js'
import {
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ListIcon,
  ListOrderedIcon,
  SeparatorHorizontalIcon,
  TextQuoteIcon,
} from 'lucide-react'
import {useEffect, useRef, useState, type JSX} from 'react'
import {Button} from './primitives/button'
import {Dialog} from './primitives/dialog'
import {FloatingPanel} from './primitives/floating-panel'
import {InsertBlockObjectForm} from './toolbar/form.insert-block-object'
import {extendBlockObject} from './toolbar/portable-text-toolbar'

type CommandMatch = {
  key: string
  label: string
  description: string
  icon: JSX.Element
  keywords: string[]
  action:
    | {type: 'insert.block'; block: {_type: string}}
    | {type: 'style.toggle'; style: string}
    | {type: 'list item.toggle'; listItem: string}
}

type BlockObjectDialogState = {
  patternSelection: NonNullable<EditorSelection>
  schema: ToolbarBlockObjectSchemaType
}

type OpenBlockObjectDialogEvent = {
  type: 'custom.slash-command.open-block-object-dialog'
} & BlockObjectDialogState

const commands: CommandMatch[] = [
  {
    key: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1Icon className="size-4" />,
    keywords: ['h1', 'heading', 'title'],
    action: {type: 'style.toggle', style: 'h1'},
  },
  {
    key: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2Icon className="size-4" />,
    keywords: ['h2', 'heading'],
    action: {type: 'style.toggle', style: 'h2'},
  },
  {
    key: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3Icon className="size-4" />,
    keywords: ['h3', 'heading'],
    action: {type: 'style.toggle', style: 'h3'},
  },
  {
    key: 'quote',
    label: 'Quote',
    description: 'Blockquote',
    icon: <TextQuoteIcon className="size-4" />,
    keywords: ['quote', 'blockquote'],
    action: {type: 'style.toggle', style: 'blockquote'},
  },
  {
    key: 'bullet',
    label: 'Bullet List',
    description: 'Unordered list',
    icon: <ListIcon className="size-4" />,
    keywords: ['bullet', 'ul', 'list', 'unordered'],
    action: {type: 'list item.toggle', listItem: 'bullet'},
  },
  {
    key: 'number',
    label: 'Numbered List',
    description: 'Ordered list',
    icon: <ListOrderedIcon className="size-4" />,
    keywords: ['number', 'ol', 'list', 'ordered'],
    action: {type: 'list item.toggle', listItem: 'number'},
  },
  {
    key: 'image',
    label: 'Image',
    description: 'Insert an image block',
    icon: <ImageIcon className="size-4" />,
    keywords: ['image', 'img', 'picture'],
    action: {
      type: 'insert.block',
      block: {_type: 'image'},
    },
  },
  {
    key: 'break',
    label: 'Divider',
    description: 'Horizontal rule',
    icon: <SeparatorHorizontalIcon className="size-4" />,
    keywords: ['break', 'hr', 'divider', 'separator', 'line'],
    action: {
      type: 'insert.block',
      block: {_type: 'break'},
    },
  },
]

const commandsFuse = new Fuse(commands, {
  keys: [
    {name: 'label', weight: 1.0},
    {name: 'keywords', weight: 0.8},
  ],
  threshold: 0.4,
  ignoreLocation: true,
})

function matchCommands({keyword}: {keyword: string}): CommandMatch[] {
  if (keyword === '') {
    return commands
  }

  return commandsFuse.search(keyword).map((result) => result.item)
}

const slashCommandPicker = defineTypeaheadPicker<CommandMatch>({
  trigger: /^\//,
  keyword: /\w*/,
  getMatches: matchCommands,
  actions: [
    ({event, snapshot}) => {
      const deletePattern = [
        raise({type: 'delete', at: event.patternSelection}),
      ]

      if (event.match.action.type === 'insert.block') {
        const blockType = event.match.action.block._type
        const blockObjectSchema = snapshot.context.schema.blockObjects.find(
          (blockObject) => blockObject.name === blockType,
        )

        if (blockObjectSchema && blockObjectSchema.fields.length > 0) {
          const extendedSchema = extendBlockObject(blockObjectSchema)

          return [
            effect(({send}) => {
              send({
                type: 'custom.slash-command.open-block-object-dialog',
                patternSelection: event.patternSelection,
                schema: extendedSchema,
              })
            }),
          ]
        }

        return [
          ...deletePattern,
          raise({
            type: 'insert.block',
            placement: 'auto',
            block: {
              ...event.match.action.block,
              _key: snapshot.context.keyGenerator(),
            },
          }),
        ]
      }

      if (event.match.action.type === 'style.toggle') {
        return [
          ...deletePattern,
          raise({type: 'style.toggle', style: event.match.action.style}),
        ]
      }

      if (event.match.action.type === 'list item.toggle') {
        return [
          ...deletePattern,
          raise({
            type: 'list item.toggle',
            listItem: event.match.action.listItem,
          }),
        ]
      }

      return deletePattern
    },
    () => [
      effect(({send}) => {
        send({type: 'focus'})
      }),
    ],
  ],
})

export function SlashCommandPickerPlugin() {
  const editor = useEditor()
  const picker = useTypeaheadPicker(slashCommandPicker)
  const {keyword, matches, selectedIndex} = picker.snapshot.context

  const [blockObjectDialogState, setBlockObjectDialogState] =
    useState<BlockObjectDialogState | null>(null)

  useEffect(() => {
    return editor.registerBehavior({
      behavior: defineBehavior<
        OpenBlockObjectDialogEvent,
        OpenBlockObjectDialogEvent['type']
      >({
        on: 'custom.slash-command.open-block-object-dialog',
        actions: [
          ({event}) => [
            effect(() => {
              setBlockObjectDialogState({
                patternSelection: event.patternSelection,
                schema: event.schema,
              })
            }),
          ],
        ],
      }),
    })
  }, [editor])

  const onDismiss = () => picker.send({type: 'dismiss'})
  const onNavigateTo = (index: number) =>
    picker.send({type: 'navigate to', index})
  const onSelect = () => picker.send({type: 'select'})

  const isActive = picker.snapshot.matches('active')

  const getAnchorRect = () => editor.dom.getSelectionRect(editor.getSnapshot())

  const handleDialogCancel = () => {
    if (blockObjectDialogState) {
      const {focus} = blockObjectDialogState.patternSelection
      editor.send({type: 'select', at: {anchor: focus, focus}})
      editor.send({type: 'focus'})
      setBlockObjectDialogState(null)
    }
  }

  const handleDialogSubmit = ({
    value,
    placement,
  }: {
    value: {[key: string]: unknown}
    placement?: 'auto' | 'before' | 'after'
  }) => {
    if (blockObjectDialogState) {
      editor.send({
        type: 'delete',
        at: blockObjectDialogState.patternSelection,
      })
      editor.send({
        type: 'insert.block',
        block: {
          _type: blockObjectDialogState.schema.name,
          _key: editor.getSnapshot().context.keyGenerator(),
          ...value,
        },
        placement: placement ?? 'auto',
        select: 'end',
      })
      editor.send({type: 'focus'})
      setBlockObjectDialogState(null)
    }
  }

  const blockObjectDialog = (
    <Dialog
      title={blockObjectDialogState?.schema.title ?? 'Insert Block'}
      isOpen={blockObjectDialogState !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen && blockObjectDialogState) {
          handleDialogCancel()
        }
      }}
      trigger={<Button className="hidden" />}
    >
      {() =>
        blockObjectDialogState && (
          <InsertBlockObjectForm
            fields={blockObjectDialogState.schema.fields}
            defaultValues={blockObjectDialogState.schema.defaultValues ?? {}}
            onSubmit={handleDialogSubmit}
          />
        )
      }
    </Dialog>
  )

  return (
    <>
      {blockObjectDialog}
      {isActive && (
        <FloatingPanel getAnchorRect={getAnchorRect} offset={4}>
          <CommandListBox
            keyword={keyword}
            matches={matches}
            selectedIndex={selectedIndex}
            onDismiss={onDismiss}
            onNavigateTo={onNavigateTo}
            onSelect={onSelect}
          />
        </FloatingPanel>
      )}
    </>
  )
}

function CommandListBox(props: {
  keyword: string
  matches: readonly CommandMatch[]
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.matches.length === 0) {
    return (
      <div className="p-2 flex items-center gap-2 text-gray-700 dark:text-gray-200">
        No commands matching "{props.keyword}"
        <Button size="sm" variant="secondary" onPress={props.onDismiss}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <ol className="p-1" style={{maxHeight: 300, overflowY: 'auto'}}>
      {props.matches.map((match, index) => (
        <CommandListItem
          key={match.key}
          match={match}
          selected={props.selectedIndex === index}
          onMouseEnter={() => props.onNavigateTo(index)}
          onSelect={props.onSelect}
        />
      ))}
    </ol>
  )
}

function CommandListItem(props: {
  match: CommandMatch
  selected: boolean
  onMouseEnter: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }, [props.selected])

  return (
    <li
      ref={ref}
      className={`px-2 py-1.5 cursor-pointer rounded flex items-center gap-2 ${
        props.selected
          ? 'bg-gray-100 dark:bg-gray-700'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span className="text-gray-500 dark:text-gray-400">
        {props.match.icon}
      </span>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{props.match.label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {props.match.description}
        </span>
      </div>
    </li>
  )
}
