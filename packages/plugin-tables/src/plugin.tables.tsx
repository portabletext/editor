import {raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {getFocusBlock} from '@portabletext/editor/selectors'
import {
  defineInputRule,
  defineInputRuleBehavior,
} from '@portabletext/plugin-input-rule'
import {
  isContainerBlock,
  type PortableTextContainerBlock,
} from '@portabletext/schema'

const addTableInputRule = defineInputRule({
  on: /\+table/,
  guard: ({event}) => {
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    return {match}
  },
  actions: [
    (_, {match}) => [
      raise({
        type: 'delete',
        at: match.targetOffsets,
      }),
      raise({
        type: 'insert.block',
        block: {
          _type: 'table',
          children: [
            {
              _type: 'row',
              children: [
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
              ],
            },
            {
              _type: 'row',
              children: [
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  children: [
                    {
                      _type: 'span',
                      text: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
        placement: 'auto',
        select: 'start',
      }),
    ],
  ],
})
const addColumnBeforeInputRule = defineInputRule({
  on: /\/\+col</,
  guard: ({event}) => {
    const firstMatch = event.matches.at(0)

    if (!firstMatch) {
      return false
    }

    return {match: firstMatch}
  },
  actions: [
    (_, {match}) => [
      raise({
        type: 'delete',
        at: match.targetOffsets,
      }),
    ],
  ],
})
const addColumnAfterInputRule = defineInputRule({
  on: /\+col>/,
  guard: ({snapshot, event}) => {
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    const focusBlock = getFocusBlock(snapshot)

    if (!focusBlock || focusBlock.node._type !== 'cell') {
      return false
    }

    const cellIndex = snapshot.blockIndexMap.get(focusBlock.node._key)?.at(-1)

    if (cellIndex === undefined) {
      return false
    }

    const rowPath = focusBlock.path.slice(0, -2)
    const row = getFocusBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: {path: rowPath, offset: 0},
          focus: {path: rowPath, offset: 0},
          backward: false,
        },
      },
    })
    if (!row || !isContainerBlock(snapshot.context, row.node)) {
      return false
    }

    const tablePath = focusBlock.path.slice(0, -4)
    const table = getFocusBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: {path: tablePath, offset: 0},
          focus: {path: tablePath, offset: 0},
          backward: false,
        },
      },
    })

    if (!table || !isContainerBlock(snapshot.context, table.node)) {
      return false
    }

    const rows = table.node.children as PortableTextContainerBlock[]

    const cellPaths = rows.flatMap((row) => {
      const referenceCell = row.children.at(cellIndex)

      if (!referenceCell) {
        return []
      }

      return [
        [
          {_key: table.node._key},
          'children',
          {_key: row._key},
          'children',
          {_key: referenceCell._key},
        ],
      ]
    })

    return {
      match,
      focusCell: focusBlock,
      focusRow: row,
      rows,
      cellIndex,
      cellPaths,
    }
  },
  actions: [
    (_, {match, focusCell, cellPaths}) => [
      raise({
        type: 'delete',
        at: match.targetOffsets,
      }),
      ...cellPaths.map((cellPath) => {
        const selection = {
          anchor: {path: cellPath, offset: 0},
          focus: {path: cellPath, offset: 0},
          backward: false,
        }
        return raise({
          type: 'insert.block',
          block: {
            _type: 'cell',
            children: [
              {
                _type: 'span',
                text: '',
              },
            ],
          },
          placement: 'after',
          select:
            JSON.stringify(cellPath) === JSON.stringify(focusCell.path)
              ? 'start'
              : 'none',
          at: selection,
        } as any)
      }),
    ],
  ],
})
const removeColumnInputRule = defineInputRule({
  on: /\/-col/,
  guard: () => {
    return true
  },
  actions: [],
})
const addRowBelowInputRule = defineInputRule({
  on: /\+row>/,
  guard: ({snapshot, event}) => {
    const match = event.matches.at(0)

    if (!match) {
      return false
    }

    const focusBlock = getFocusBlock(snapshot)

    if (!focusBlock || focusBlock.node._type !== 'cell') {
      return false
    }

    const rowPath = focusBlock.path.slice(0, -2)

    const row = getFocusBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: {
            path: rowPath,
            offset: 0,
          },
          focus: {
            path: rowPath,
            offset: 0,
          },
          backward: false,
        },
      },
    })

    if (!row || !isContainerBlock(snapshot.context, row.node)) {
      return false
    }

    const cellCount = row.node.children.length

    return {match, rowPath, cellCount}
  },
  actions: [
    (_, {match, rowPath, cellCount}) => [
      raise({
        type: 'delete',
        at: match.targetOffsets,
      }),
      raise({
        type: 'insert.block',
        block: {
          _type: 'row',
          children: Array.from({length: cellCount}).map(() => ({
            _type: 'cell',
            children: [
              {
                _type: 'span',
                text: '',
              },
            ],
          })),
        },
        placement: 'after',
        select: 'start',
        at: {
          anchor: {
            path: rowPath,
            offset: 0,
          },
          focus: {
            path: rowPath,
            offset: 0,
          },
          backward: false,
        },
      } as any),
    ],
  ],
})
const addRowAboveInputRule = defineInputRule({
  on: /\/\+row</,
  guard: () => {
    return true
  },
  actions: [],
})
const removeRowInputRule = defineInputRule({
  on: /\/-row/,
  guard: () => {
    return true
  },
  actions: [],
})

const tableBehaviors = defineInputRuleBehavior({
  rules: [
    addTableInputRule,
    addRowBelowInputRule,
    addRowAboveInputRule,
    removeRowInputRule,
    addColumnBeforeInputRule,
    addColumnAfterInputRule,
    removeColumnInputRule,
  ],
})

/**
 * @alpha
 */
export function TablesPlugin() {
  return <BehaviorPlugin behaviors={[tableBehaviors]} />
}
