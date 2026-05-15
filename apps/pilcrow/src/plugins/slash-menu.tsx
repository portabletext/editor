import {useEditor} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'
import Fuse from 'fuse.js'
import {useEffect, useLayoutEffect, useRef, useState} from 'react'

/**
 * Slash command picker. User types '/' followed by a keyword and a
 * floating list of insertable blocks appears at the caret. Arrow keys
 * navigate, Enter or click inserts.
 *
 * Commands map to either:
 *   - `style.toggle` for heading levels (the current text block changes
 *     style without losing its content)
 *   - `insert.block` for container blocks (list, blockquote, callout,
 *     code-block, table) and leaf blocks (image, horizontal-rule),
 *     each with a starter scaffold that satisfies the schema.
 *
 * After selection the trigger pattern (the '/' plus typed keyword) is
 * deleted so the visible text reflects only the inserted content.
 */

type Command = {
  key: string
  label: string
  description: string
  keywords: ReadonlyArray<string>
  action:
    | {type: 'style.toggle'; style: string}
    | {type: 'insert.block'; block: Record<string, unknown>}
}

function emptyParagraph() {
  return {
    _type: 'block',
    style: 'normal',
    children: [{_type: 'span', text: '', marks: []}],
    markDefs: [],
  }
}

function emptyListItem() {
  return {
    _type: 'list-item',
    content: [emptyParagraph()],
  }
}

function emptyTaskItem() {
  return {
    _type: 'list-item',
    checked: false,
    content: [emptyParagraph()],
  }
}

const commands: ReadonlyArray<Command> = [
  {
    key: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'heading', 'title'],
    action: {type: 'style.toggle', style: 'h1'},
  },
  {
    key: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'heading'],
    action: {type: 'style.toggle', style: 'h2'},
  },
  {
    key: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading'],
    action: {type: 'style.toggle', style: 'h3'},
  },
  {
    key: 'bullet',
    label: 'Bullet list',
    description: 'Unordered list',
    keywords: ['bullet', 'ul', 'list', 'unordered'],
    action: {
      type: 'insert.block',
      block: {_type: 'list', kind: 'bullet', items: [emptyListItem()]},
    },
  },
  {
    key: 'number',
    label: 'Numbered list',
    description: 'Ordered list',
    keywords: ['number', 'ol', 'list', 'ordered'],
    action: {
      type: 'insert.block',
      block: {_type: 'list', kind: 'number', items: [emptyListItem()]},
    },
  },
  {
    key: 'task',
    label: 'Task list',
    description: 'Checkbox list',
    keywords: ['task', 'todo', 'checkbox', 'check'],
    action: {
      type: 'insert.block',
      block: {_type: 'list', kind: 'task', items: [emptyTaskItem()]},
    },
  },
  {
    key: 'quote',
    label: 'Blockquote',
    description: 'Set off a quotation',
    keywords: ['quote', 'blockquote'],
    action: {
      type: 'insert.block',
      block: {_type: 'blockquote', content: [emptyParagraph()]},
    },
  },
  {
    key: 'callout',
    label: 'Callout',
    description: 'Highlighted note',
    keywords: ['callout', 'note', 'aside', 'info'],
    action: {
      type: 'insert.block',
      block: {
        _type: 'callout',
        tone: 'note',
        content: [emptyParagraph()],
      },
    },
  },
  {
    key: 'code',
    label: 'Code block',
    description: 'Formatted code snippet',
    keywords: ['code', 'pre', 'snippet'],
    action: {
      type: 'insert.block',
      block: {
        _type: 'code-block',
        language: 'text',
        lines: [emptyParagraph()],
      },
    },
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Rows and columns',
    keywords: ['table', 'grid', 'rows', 'columns'],
    action: {
      type: 'insert.block',
      block: {
        _type: 'table',
        headerRows: 1,
        rows: [
          {
            _type: 'row',
            cells: [
              {_type: 'cell', content: [emptyParagraph()]},
              {_type: 'cell', content: [emptyParagraph()]},
            ],
          },
          {
            _type: 'row',
            cells: [
              {_type: 'cell', content: [emptyParagraph()]},
              {_type: 'cell', content: [emptyParagraph()]},
            ],
          },
        ],
      },
    },
  },
  {
    key: 'image',
    label: 'Image',
    description: 'Insert an image',
    keywords: ['image', 'img', 'picture'],
    action: {type: 'insert.block', block: {_type: 'image', src: '', alt: ''}},
  },
  {
    key: 'hr',
    label: 'Divider',
    description: 'Horizontal rule',
    keywords: ['hr', 'divider', 'separator', 'line'],
    action: {type: 'insert.block', block: {_type: 'horizontal-rule'}},
  },
]

const commandsFuse = new Fuse(commands, {
  keys: [
    {name: 'label', weight: 1},
    {name: 'keywords', weight: 0.8},
  ],
  threshold: 0.4,
  ignoreLocation: true,
})

function matchCommands({keyword}: {keyword: string}): ReadonlyArray<Command> {
  if (keyword === '') {
    return commands
  }
  return commandsFuse.search(keyword).map((result) => result.item)
}

const slashCommandPicker = defineTypeaheadPicker<Command>({
  trigger: /^\//,
  keyword: /\w*/,
  getMatches: matchCommands,
  onSelect: [
    ({event, snapshot}) => {
      const deletePattern = raise({type: 'delete', at: event.patternSelection})

      if (event.match.action.type === 'style.toggle') {
        return [
          deletePattern,
          raise({type: 'style.toggle', style: event.match.action.style}),
        ]
      }

      return [
        deletePattern,
        raise({
          type: 'insert.block',
          placement: 'auto',
          block: {
            ...event.match.action.block,
            _key: snapshot.context.keyGenerator(),
          },
        }),
      ]
    },
  ],
})

export function SlashMenuPlugin() {
  const editor = useEditor()
  const picker = useTypeaheadPicker(slashCommandPicker)
  const {keyword, matches, selectedIndex} = picker.snapshot.context
  const isActive = picker.snapshot.matches('active')

  const [position, setPosition] = useState<{top: number; left: number} | null>(
    null,
  )

  useLayoutEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }
    const update = () => {
      const rect = editor.dom.getSelectionRect(editor.getSnapshot())
      if (!rect) {
        setPosition(null)
        return
      }
      setPosition({top: rect.bottom + 4, left: rect.left})
    }
    update()
    const id = window.requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [editor, isActive, keyword, matches])

  if (!isActive || !position) {
    return null
  }

  return (
    <div
      className="pc-slash-menu"
      style={{top: position.top, left: position.left}}
      role="dialog"
      aria-label="Insert block"
      onMouseDown={(event) => event.preventDefault()}
    >
      <CommandList
        keyword={keyword}
        matches={matches}
        selectedIndex={selectedIndex}
        onDismiss={() => picker.send({type: 'dismiss'})}
        onNavigateTo={(index) => picker.send({type: 'navigate to', index})}
        onSelect={() => picker.send({type: 'select'})}
      />
    </div>
  )
}

function CommandList(props: {
  keyword: string
  matches: ReadonlyArray<Command>
  selectedIndex: number
  onDismiss: () => void
  onNavigateTo: (index: number) => void
  onSelect: () => void
}) {
  if (props.matches.length === 0) {
    return (
      <div className="pc-slash-menu-empty">
        <span>No commands matching "{props.keyword}"</span>
        <button
          type="button"
          className="pc-slash-menu-dismiss"
          onClick={props.onDismiss}
        >
          Dismiss
        </button>
      </div>
    )
  }
  return (
    <ol className="pc-slash-menu-list">
      {props.matches.map((match, index) => (
        <CommandItem
          key={match.key}
          match={match}
          selected={index === props.selectedIndex}
          onMouseEnter={() => props.onNavigateTo(index)}
          onSelect={props.onSelect}
        />
      ))}
    </ol>
  )
}

function CommandItem(props: {
  match: Command
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
      className={`pc-slash-menu-item${props.selected ? ' pc-slash-menu-item-selected' : ''}`}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onSelect}
    >
      <span className="pc-slash-menu-label">{props.match.label}</span>
      <span className="pc-slash-menu-desc">{props.match.description}</span>
    </li>
  )
}
