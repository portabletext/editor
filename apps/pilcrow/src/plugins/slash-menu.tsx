import {raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'
import {useEffect, useRef} from 'react'
import {TypeaheadPanel} from './typeahead-panel'

/**
 * Slash menu: type `/` at the start of a block to open a list of
 * block-level commands. The list matches by case-insensitive
 * substring against the command label and keywords. Selecting a
 * command deletes the `/` pattern and dispatches the matching event
 * (style toggle, list toggle, or block insert).
 */
type SlashAction =
  | {type: 'style'; style: string}
  | {type: 'list'; kind: string}
  | {type: 'block'; blockType: string}
  | {
      type: 'table-op'
      op: 'add-row' | 'remove-row' | 'add-column' | 'remove-column'
    }

type SlashCommand = {
  key: string
  label: string
  hint: string
  keywords: ReadonlyArray<string>
  action: SlashAction
}

const commands: ReadonlyArray<SlashCommand> = [
  {
    key: 'h1',
    label: 'Heading 1',
    hint: 'Large section heading',
    keywords: ['heading', 'h1', 'title'],
    action: {type: 'style', style: 'h1'},
  },
  {
    key: 'h2',
    label: 'Heading 2',
    hint: 'Medium section heading',
    keywords: ['heading', 'h2'],
    action: {type: 'style', style: 'h2'},
  },
  {
    key: 'h3',
    label: 'Heading 3',
    hint: 'Small section heading',
    keywords: ['heading', 'h3'],
    action: {type: 'style', style: 'h3'},
  },
  {
    key: 'quote',
    label: 'Quote',
    hint: 'Blockquote',
    keywords: ['quote', 'blockquote'],
    action: {type: 'block', blockType: 'blockquote'},
  },
  {
    key: 'bullet',
    label: 'Bullet list',
    hint: 'Unordered list',
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: {type: 'list', kind: 'bullet'},
  },
  {
    key: 'number',
    label: 'Numbered list',
    hint: 'Ordered list',
    keywords: ['numbered', 'number', 'list', 'ordered', 'ol'],
    action: {type: 'list', kind: 'number'},
  },
  {
    key: 'task',
    label: 'Task list',
    hint: 'Checkbox list',
    keywords: ['task', 'todo', 'checkbox', 'check', 'list'],
    action: {type: 'list', kind: 'task'},
  },
  {
    key: 'image',
    label: 'Image',
    hint: 'Insert an image',
    keywords: ['image', 'img', 'picture', 'photo'],
    action: {type: 'block', blockType: 'image'},
  },
  {
    key: 'callout',
    label: 'Callout',
    hint: 'Highlighted note or aside',
    keywords: ['callout', 'note', 'aside', 'info', 'admonition'],
    action: {type: 'block', blockType: 'callout'},
  },
  {
    key: 'code-block',
    label: 'Code block',
    hint: 'Formatted code snippet',
    keywords: ['code', 'codeblock', 'pre', 'snippet'],
    action: {type: 'block', blockType: 'code-block'},
  },
  {
    key: 'table',
    label: 'Table',
    hint: 'Rows and columns',
    keywords: ['table', 'grid', 'rows', 'columns'],
    action: {type: 'block', blockType: 'table'},
  },
  {
    key: 'divider',
    label: 'Divider',
    hint: 'Horizontal rule',
    keywords: ['hr', 'rule', 'divider', 'separator', 'break', 'line'],
    action: {type: 'block', blockType: 'horizontal-rule'},
  },
  {
    key: 'add-row',
    label: 'Add row',
    hint: 'Insert a row after the current row',
    keywords: ['add', 'insert', 'row', 'table'],
    action: {type: 'table-op', op: 'add-row'},
  },
  {
    key: 'remove-row',
    label: 'Remove row',
    hint: 'Delete the current row',
    keywords: ['remove', 'delete', 'row', 'table'],
    action: {type: 'table-op', op: 'remove-row'},
  },
  {
    key: 'add-column',
    label: 'Add column',
    hint: 'Insert a column after the current column',
    keywords: ['add', 'insert', 'column', 'col', 'table'],
    action: {type: 'table-op', op: 'add-column'},
  },
  {
    key: 'remove-column',
    label: 'Remove column',
    hint: 'Delete the current column',
    keywords: ['remove', 'delete', 'column', 'col', 'table'],
    action: {type: 'table-op', op: 'remove-column'},
  },
]

function matchCommands({
  keyword,
}: {
  keyword: string
}): ReadonlyArray<SlashCommand> {
  if (keyword.trim() === '') {
    return commands
  }
  const term = keyword.toLowerCase()
  // Score: exact label > label-startsWith > keyword-exact > keyword-startsWith > label-substring > keyword-substring.
  type Scored = {command: SlashCommand; score: number}
  const scored: Array<Scored> = []
  for (const command of commands) {
    const label = command.label.toLowerCase()
    let best = 0
    if (label === term) {
      best = 6
    } else if (label.startsWith(term)) {
      best = 5
    } else {
      for (const kw of command.keywords) {
        if (kw === term) {
          best = Math.max(best, 4)
        } else if (kw.startsWith(term)) {
          best = Math.max(best, 3)
        } else if (kw.includes(term)) {
          best = Math.max(best, 1)
        }
      }
      if (label.includes(term)) {
        best = Math.max(best, 2)
      }
    }
    if (best > 0) {
      scored.push({command, score: best})
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.command)
}

const slashCommandPicker = defineTypeaheadPicker<SlashCommand>({
  trigger: /^\//,
  keyword: /[\w-]*/,
  getMatches: matchCommands,
  onSelect: [
    ({event, snapshot}) => {
      const raises = [raise({type: 'delete', at: event.patternSelection})]
      const action = event.match.action
      if (action.type === 'style') {
        raises.push(raise({type: 'style.toggle', style: action.style}))
      } else if (action.type === 'list') {
        // Lists in Pilcrow are containers; the structured-lists plugin
        // listens for the markdown input rules `- ` / `1. ` and the
        // [!TONE] callout rule. Slash-menu inserts the list container
        // directly with one empty list-item.
        const keyGen = snapshot.context.keyGenerator
        raises.push(
          raise({
            type: 'insert.block',
            placement: 'auto',
            block: {
              _type: 'list',
              _key: keyGen(),
              kind: action.kind,
              items: [
                {
                  _type: 'list-item',
                  _key: keyGen(),
                  content: [
                    {
                      _type: 'block',
                      _key: keyGen(),
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: keyGen(),
                          text: '',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            } as never,
          }),
        )
      } else if (action.type === 'table-op') {
        raises.push(raise({type: `custom.tables.${action.op}` as never}))
      } else if (action.blockType === 'blockquote') {
        const keyGen = snapshot.context.keyGenerator
        raises.push(
          raise({
            type: 'insert.block',
            placement: 'auto',
            block: {
              _type: 'blockquote',
              _key: keyGen(),
              content: [
                {
                  _type: 'block',
                  _key: keyGen(),
                  style: 'normal',
                  children: [
                    {_type: 'span', _key: keyGen(), text: '', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            } as never,
          }),
        )
      } else {
        const keyGen = snapshot.context.keyGenerator
        raises.push(
          raise({
            type: 'insert.block',
            placement: 'auto',
            block: {
              _type: action.blockType,
              _key: keyGen(),
            },
          }),
        )
      }
      return raises
    },
  ],
})

export function SlashMenuPlugin() {
  const picker = useTypeaheadPicker(slashCommandPicker)
  const {matches, selectedIndex, keyword} = picker.snapshot.context
  const isActive = picker.snapshot.matches('active')

  return (
    <TypeaheadPanel active={isActive}>
      {matches.length === 0 ? (
        <div className="pc-typeahead-empty">
          No commands matching "{keyword}"
        </div>
      ) : (
        <ul className="pc-typeahead-list">
          {matches.map((command, index) => (
            <SlashItem
              key={command.key}
              command={command}
              selected={index === selectedIndex}
              onHover={() => picker.send({type: 'navigate to', index})}
              onSelect={() => picker.send({type: 'select'})}
            />
          ))}
        </ul>
      )}
    </TypeaheadPanel>
  )
}

function SlashItem(props: {
  command: SlashCommand
  selected: boolean
  onHover: () => void
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({block: 'nearest'})
    }
  }, [props.selected])
  return (
    <li
      ref={ref}
      className={`pc-typeahead-item${props.selected ? ' pc-typeahead-item-selected' : ''}`}
      onMouseEnter={props.onHover}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onSelect}
    >
      <span className="pc-typeahead-item-label">{props.command.label}</span>
      <span className="pc-typeahead-item-hint">{props.command.hint}</span>
    </li>
  )
}
