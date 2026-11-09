export type Rng = {
  next: () => number
  int: (bound: number) => number
  pick: <T>(items: ReadonlyArray<T>) => T
  chance: (probability: number) => boolean
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (bound) => Math.floor(next() * bound),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (probability) => next() < probability,
  }
}

export type Depth = 'root' | 'callout' | 'nested callout' | 'table cell'
export const depths: Array<Depth> = [
  'root',
  'callout',
  'nested callout',
  'table cell',
]

type Json = any

const words = ['foo', 'bar', 'baz', 'foo bar', 'qux', 'lorem ipsum']
const decoratorSets: Array<Array<string>> = [
  [],
  [],
  ['strong'],
  ['em'],
  ['strong', 'em'],
]

export function buildDoc(rng: Rng, newKey: () => string): Array<Json> {
  const nestedCallout = {
    _key: newKey(),
    _type: 'callout',
    content: blocks(rng, newKey, 1 + rng.int(2), true),
  }
  const callout = {
    _key: newKey(),
    _type: 'callout',
    content: [
      ...blocks(rng, newKey, 1 + rng.int(2), true),
      nestedCallout,
      ...blocks(rng, newKey, rng.int(2), true),
    ],
  }
  const table = {
    _key: newKey(),
    _type: 'table',
    rows: Array.from({length: 1 + rng.int(2)}, () => ({
      _key: newKey(),
      _type: 'row',
      cells: Array.from({length: 1 + rng.int(2)}, () => ({
        _key: newKey(),
        _type: 'cell',
        content: blocks(rng, newKey, 1 + rng.int(3), true),
      })),
    })),
  }
  const root = [
    ...blocks(rng, newKey, 1 + rng.int(2), true),
    callout,
    table,
    ...blocks(rng, newKey, rng.int(2), true),
  ]
  for (let index = root.length - 1; index > 0; index--) {
    const swap = rng.int(index + 1)
    ;[root[index], root[swap]] = [root[swap]!, root[index]!]
  }
  return root
}

function blocks(
  rng: Rng,
  newKey: () => string,
  count: number,
  textOnly: boolean,
): Array<Json> {
  return Array.from({length: count}, () =>
    !textOnly && rng.chance(0.2)
      ? newImage(rng, newKey)
      : newTextBlock(rng, newKey),
  )
}

function newImage(rng: Rng, newKey: () => string): Json {
  return {_key: newKey(), _type: 'image', url: rng.pick(words)}
}

function newTextBlock(rng: Rng, newKey: () => string): Json {
  const markDefs: Array<Json> = []
  const children: Array<Json> = []
  const spanCount = 1 + rng.int(3)
  let previousMarks: Array<string> | undefined
  for (let index = 0; index < spanCount; index++) {
    if (index > 0 && rng.chance(0.25)) {
      children.push({
        _key: newKey(),
        _type: 'stock-ticker',
        symbol: rng.pick(['FOO', 'BAR']),
      })
      previousMarks = undefined
    }
    let marks: Array<string>
    do {
      marks = [...rng.pick(decoratorSets)]
      if (rng.chance(0.2)) {
        const markKey = newKey()
        markDefs.push({_key: markKey, _type: 'link', href: rng.pick(words)})
        marks.push(markKey)
      }
    } while (previousMarks && sameMarks(previousMarks, marks))
    children.push({
      _key: newKey(),
      _type: 'span',
      text: rng.pick(words),
      marks,
    })
    previousMarks = marks
  }
  const block: Json = {
    _key: newKey(),
    _type: 'block',
    children,
    markDefs,
    style: rng.chance(0.2) ? 'h1' : 'normal',
  }
  if (rng.chance(0.15)) {
    block.listItem = 'bullet'
    block.level = 1
  }
  return block
}

function sameMarks(left: Array<string>, right: Array<string>) {
  return (
    left.length === right.length && left.every((mark, i) => mark === right[i])
  )
}

type ListRef = {depth: Depth; list: Array<Json>}

function blockLists(value: Array<Json>): Array<ListRef> {
  const found: Array<ListRef> = []
  const walk = (list: Array<Json>, depth: Depth) => {
    found.push({depth, list})
    for (const block of list) {
      if (block._type === 'callout' && Array.isArray(block.content)) {
        walk(block.content, depth === 'root' ? 'callout' : 'nested callout')
      } else if (block._type === 'table') {
        for (const row of block.rows ?? []) {
          for (const cell of row.cells ?? []) {
            if (Array.isArray(cell.content)) {
              walk(cell.content, 'table cell')
            }
          }
        }
      }
    }
  }
  walk(value, 'root')
  return found
}

export function editValue(
  rng: Rng,
  newKey: () => string,
  before: Array<Json>,
  editCount: number,
  firstDepth: Depth,
): {wanted: Array<Json>; applied: Array<string>} {
  const wanted: Array<Json> = structuredClone(before)
  const applied: Array<string> = []
  for (let editIndex = 0; editIndex < editCount; editIndex++) {
    const depth = editIndex === 0 ? firstDepth : rng.pick(depths)
    for (let attempt = 0; attempt < 12; attempt++) {
      const lists = blockLists(wanted).filter((ref) => ref.depth === depth)
      const ref = lists.length > 0 ? rng.pick(lists) : blockLists(wanted)[0]!
      const name = rng.pick(Object.keys(edits))
      if (edits[name]!(rng, newKey, wanted, ref)) {
        applied.push(name)
        break
      }
    }
  }
  return {wanted, applied}
}

type Edit = (
  rng: Rng,
  newKey: () => string,
  wanted: Array<Json>,
  ref: ListRef,
) => boolean

function pickPosition(rng: Rng, length: number): number {
  const where = rng.pick(['first', 'middle', 'last'])
  return where === 'first'
    ? 0
    : where === 'last'
      ? length - 1
      : Math.floor((length - 1) / 2)
}

function textBlocksIn(ref: ListRef) {
  return ref.list.filter((block) => block._type === 'block')
}

function spansOf(block: Json): Array<Json> {
  return block.children.filter((child: Json) => child._type === 'span')
}

function canon(block: Json) {
  const merged: Array<Json> = []
  for (const child of block.children) {
    const previous = merged[merged.length - 1]
    if (
      previous &&
      previous._type === 'span' &&
      child._type === 'span' &&
      sameMarks(previous.marks, child.marks)
    ) {
      previous.text += child.text
    } else {
      merged.push(child)
    }
  }
  block.children = merged
  const used = new Set(merged.flatMap((child) => child.marks ?? []))
  block.markDefs = block.markDefs.filter((def: Json) => used.has(def._key))
}

function pickSpanBlock(rng: Rng, ref: ListRef) {
  const candidates = textBlocksIn(ref)
  return candidates.length > 0 ? rng.pick(candidates) : undefined
}

const edits: Record<string, Edit> = {
  textEdit(rng, _newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    const spans = spansOf(block)
    const span = spans[pickPosition(rng, spans.length)]
    const length = span.text.length
    const at = rng.pick(['first', 'middle', 'last'])
    const index =
      at === 'first' ? 0 : at === 'last' ? length : Math.floor(length / 2)
    const kind = rng.pick(['insert', 'delete', 'replace'])
    if (kind === 'insert' || length < 2) {
      span.text =
        span.text.slice(0, index) +
        rng.pick(['x', 'new', ' more']) +
        span.text.slice(index)
    } else if (kind === 'delete') {
      const end = Math.min(length, index + 1 + rng.int(2))
      const start = end === index ? Math.max(0, index - 1) : index
      span.text = span.text.slice(0, start) + span.text.slice(end)
      if (span.text === '') {
        span.text = 'z'
      }
    } else {
      const end = Math.min(length, index + 1 + rng.int(2))
      span.text = `${span.text.slice(0, index)}ZZ${span.text.slice(end)}`
    }
    return true
  },
  markChange(rng, _newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    const span = rng.pick(spansOf(block))
    const links = span.marks.filter((mark: string) =>
      block.markDefs.some((def: Json) => def._key === mark),
    )
    span.marks = [...rng.pick(decoratorSets), ...links]
    canon(block)
    return true
  },
  spanSplit(rng, newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    const span = rng.pick(
      spansOf(block).filter((candidate: Json) => candidate.text.length >= 2),
    )
    if (!span) {
      return false
    }
    const cut = 1 + rng.int(span.text.length - 1)
    const tail = {
      _key: newKey(),
      _type: 'span',
      text: span.text.slice(cut),
      marks: span.marks.includes('strong')
        ? span.marks.filter((mark: string) => mark !== 'strong')
        : ['strong', ...span.marks],
    }
    span.text = span.text.slice(0, cut)
    block.children.splice(block.children.indexOf(span) + 1, 0, tail)
    return true
  },
  spanMerge(rng, _newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    const options: Array<number> = Array.from(
      {length: block.children.length},
      (_unused, index) => index,
    ).filter(
      (index: number) =>
        block.children[index]._type === 'span' &&
        block.children[index + 1]?._type === 'span',
    )
    if (options.length === 0) {
      return false
    }
    const index = rng.pick(options)
    const left = block.children[index]
    const right = block.children[index + 1]
    left.text += right.text
    block.children.splice(index + 1, 1)
    canon(block)
    return true
  },
  markDefAdd(rng, newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    const span = rng.pick(spansOf(block))
    const markKey = newKey()
    block.markDefs.push({_key: markKey, _type: 'link', href: rng.pick(words)})
    span.marks.push(markKey)
    return true
  },
  markDefRemove(rng, _newKey, _wanted, ref) {
    const candidates = textBlocksIn(ref).filter(
      (block) => block.markDefs.length > 0,
    )
    if (candidates.length === 0) {
      return false
    }
    const block = rng.pick(candidates)
    const def = rng.pick(block.markDefs as Array<Json>)
    for (const child of block.children) {
      if (child.marks) {
        child.marks = child.marks.filter((mark: string) => mark !== def._key)
      }
    }
    canon(block)
    return true
  },
  markDefChange(rng, _newKey, _wanted, ref) {
    const candidates = textBlocksIn(ref).filter(
      (block) => block.markDefs.length > 0,
    )
    if (candidates.length === 0) {
      return false
    }
    const def = rng.pick(rng.pick(candidates).markDefs as Array<Json>)
    def.href = `${def.href}-x`
    return true
  },
  blockInsert(rng, newKey, _wanted, ref) {
    const block = rng.chance(0.75)
      ? newTextBlock(rng, newKey)
      : newImage(rng, newKey)
    const where = rng.pick(['first', 'middle', 'last'])
    const index =
      where === 'first'
        ? 0
        : where === 'last'
          ? ref.list.length
          : Math.floor(ref.list.length / 2)
    ref.list.splice(index, 0, block)
    return true
  },
  blockRemove(rng, _newKey, _wanted, ref) {
    if (ref.list.length < 2) {
      return false
    }
    ref.list.splice(pickPosition(rng, ref.list.length), 1)
    return true
  },
  blockMove(rng, _newKey, _wanted, ref) {
    if (ref.list.length < 2) {
      return false
    }
    const [moved] = ref.list.splice(pickPosition(rng, ref.list.length), 1)
    const where = rng.pick(['first', 'middle', 'last'])
    const index =
      where === 'first'
        ? 0
        : where === 'last'
          ? ref.list.length
          : Math.floor(ref.list.length / 2)
    ref.list.splice(index, 0, moved)
    return true
  },
  styleChange(rng, _newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    block.style = block.style === 'normal' ? 'h1' : 'normal'
    return true
  },
  listItemChange(rng, _newKey, _wanted, ref) {
    const block = pickSpanBlock(rng, ref)
    if (!block) {
      return false
    }
    if (block.listItem) {
      delete block.listItem
      delete block.level
    } else {
      block.listItem = 'bullet'
      block.level = 1 + rng.int(2)
    }
    return true
  },
  typeChange(rng, newKey, _wanted, ref) {
    const index = rng.int(ref.list.length)
    const old = ref.list[index]
    if (old._type === 'block') {
      ref.list[index] = {...newImage(rng, newKey), _key: old._key}
    } else if (old._type === 'image') {
      ref.list[index] = {...newTextBlock(rng, newKey), _key: old._key}
    } else {
      return false
    }
    return true
  },
  containerInsert(rng, newKey, wanted, ref) {
    if (rng.chance(0.3)) {
      const tables = wanted.filter((block) => block._type === 'table')
      if (tables.length > 0) {
        const table = rng.pick(tables)
        const row = rng.pick(table.rows as Array<Json>)
        if (rng.chance(0.5)) {
          row.cells.splice(rng.int(row.cells.length + 1), 0, {
            _key: newKey(),
            _type: 'cell',
            content: [newTextBlock(rng, newKey)],
          })
        } else {
          table.rows.splice(rng.int(table.rows.length + 1), 0, {
            _key: newKey(),
            _type: 'row',
            cells: [
              {
                _key: newKey(),
                _type: 'cell',
                content: [newTextBlock(rng, newKey)],
              },
            ],
          })
        }
        return true
      }
    }
    if (ref.depth === 'table cell') {
      return false
    }
    ref.list.splice(rng.int(ref.list.length + 1), 0, {
      _key: newKey(),
      _type: 'callout',
      content: [newTextBlock(rng, newKey), newTextBlock(rng, newKey)],
    })
    return true
  },
  containerRemove(rng, _newKey, wanted, ref) {
    if (rng.chance(0.3)) {
      const tables = wanted.filter((block) => block._type === 'table')
      if (tables.length > 0) {
        const table = rng.pick(tables)
        const row = rng.pick(table.rows as Array<Json>)
        if (row.cells.length > 1 && rng.chance(0.5)) {
          row.cells.splice(rng.int(row.cells.length), 1)
          return true
        }
        if (table.rows.length > 1) {
          table.rows.splice(rng.int(table.rows.length), 1)
          return true
        }
      }
    }
    const options = ref.list
      .map((block, index) => ({block, index}))
      .filter(({block}) => block._type === 'callout' || block._type === 'table')
    if (options.length === 0 || ref.list.length < 2) {
      return false
    }
    ref.list.splice(rng.pick(options).index, 1)
    return true
  },
  rekey(rng, newKey, wanted, ref) {
    const kind = rng.pick(['span', 'block', 'container'])
    if (kind === 'span') {
      const block = pickSpanBlock(rng, ref)
      if (!block) {
        return false
      }
      const child = rng.pick(block.children as Array<Json>)
      const oldKey = child._key
      child._key = newKey()
      return oldKey !== child._key
    }
    if (kind === 'block') {
      rng.pick(ref.list)._key = newKey()
      return true
    }
    const tables = wanted.filter((block) => block._type === 'table')
    if (tables.length === 0) {
      return false
    }
    const table = rng.pick(tables)
    const row = rng.pick(table.rows as Array<Json>)
    rng.pick([row, rng.pick(row.cells as Array<Json>)])._key = newKey()
    return true
  },
}
