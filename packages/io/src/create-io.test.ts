import {
  diffMatchPatch,
  set,
  unset,
  type Patch,
  type Path,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createIo} from './create-io'
import {gapWait} from './io-machine'
import type {
  EditorEventForIo,
  EditorForIo,
  EditorMessageForIo,
  IoEvent,
} from './types'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe(createIo.name, () => {
  test('applies a transaction held before load that follows on from the loaded revision', () => {
    const {io, editor, editorMessages} = setup()

    io.send(
      transaction('r2', 'r3', [
        set('baz', [{_key: 'b1'}, 'children', {_key: 's1'}, 'text']),
      ]),
    )
    io.send(
      transaction('r1', 'r2', [
        set('bar', [{_key: 'b1'}, 'children', {_key: 's1'}, 'text']),
      ]),
    )
    io.send({type: 'load', value: [textBlock('b1', 's1', 'bar')], rev: 'r2'})
    editor.emit({type: 'ready'})

    expect({
      rev: io.getSnapshot().context.rev,
      editorMessages,
    }).toEqual({
      rev: 'r3',
      editorMessages: [
        {type: 'load', value: [textBlock('b1', 's1', 'bar')]},
        {
          type: 'apply',
          patches: [
            diffMatchPatch('bar', 'baz', [
              {_key: 'b1'},
              'children',
              {_key: 's1'},
              'text',
            ]),
          ],
        },
      ],
    })
  })

  test('sends at the maximum wait while changes keep restarting the quiet wait', () => {
    const {io, editor} = setup()

    io.send({type: 'load', value: [textBlock('b1', 's1', 'foo')], rev: 'r1'})
    editor.emit({type: 'ready'})

    const sent: Array<{at: number; patches: Array<Patch>}> = []
    io.on('mutation', (mutation) => {
      sent.push({at: Date.now() - start, patches: mutation.patches})
    })
    const start = Date.now()

    for (let change = 0; change < 8; change++) {
      editor.emit({type: 'change', patches: [textEdit(change)]})
      vi.advanceTimersByTime(800)
    }

    expect(sent).toEqual([
      {at: 5_000, patches: [0, 1, 2, 3, 4, 5, 6].map(textEdit)},
    ])
  })

  test('sends no mutation when the pending changes lost their target', () => {
    const {io, editor, events} = setup()

    io.send({
      type: 'load',
      value: [textBlock('b1', 's1', 'foo'), textBlock('b2', 's2', 'bar')],
      rev: 'r1',
    })
    editor.emit({type: 'ready'})
    const edit = set('foox', [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'])
    editor.emit({type: 'change', patches: [edit]})
    io.send(transaction('r1', 'r2', [{type: 'unset', path: [{_key: 'b1'}]}]))
    vi.advanceTimersByTime(5_000)

    expect({events, value: io.getSnapshot().value}).toEqual({
      events: [{type: 'work dropped', patches: [edit], reason: 'no target'}],
      value: {ready: 'synced'},
    })
  })

  test('skips a text diff to a field or an index that is not there', () => {
    const {io, editor, editorMessages} = setup()

    io.send({type: 'load', value: [textBlock('b1', 's1', 'foo')], rev: 'r1'})
    editor.emit({type: 'ready'})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('', 'x', [{_key: 'b1'}, 'title']),
        diffMatchPatch('', 'x', [{_key: 'b1'}, 'children', 5, 'text']),
      ]),
    )

    expect({
      value: io.getSnapshot().value,
      rev: io.getSnapshot().context.rev,
      editorMessages,
    }).toEqual({
      value: {ready: 'synced'},
      rev: 'r2',
      editorMessages: [{type: 'load', value: [textBlock('b1', 's1', 'foo')]}],
    })
  })

  test('goes out of step on a text diff to a field that is not a string', () => {
    const {io, editor} = setup()

    io.send({type: 'load', value: [textBlock('b1', 's1', 'foo')], rev: 'r1'})
    editor.emit({type: 'ready'})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('', 'x', [{_key: 'b1'}, 'children']),
      ]),
    )

    expect({
      value: io.getSnapshot().value,
      outOfStep: io.getSnapshot().context.outOfStep,
    }).toEqual({
      value: {ready: 'out of step'},
      outOfStep: {reason: 'patch failed'},
    })
  })

  test('counts a negative index from the end of the list', () => {
    const {io, editor, editorMessages} = setup()

    io.send({
      type: 'load',
      value: [textBlock('b1', 's1', 'foo'), textBlock('b2', 's2', 'bar')],
      rev: 'r1',
    })
    editor.emit({type: 'ready'})
    io.send(transaction('r1', 'r2', [set('h1', [-1, 'style'])]))
    io.send(transaction('r2', 'r3', [set('h1', [-5, 'style'])]))

    expect(editorMessages).toEqual([
      {
        type: 'load',
        value: [textBlock('b1', 's1', 'foo'), textBlock('b2', 's2', 'bar')],
      },
      {type: 'apply', patches: [set('h1', [{_key: 'b2'}, 'style'])]},
    ])
  })

  test('skips a repeated transaction from more than 100 transactions back', () => {
    const {io, editor} = setup()

    io.send({type: 'load', value: [textBlock('b1', 's1', 'foo')], rev: 'r0'})
    editor.emit({type: 'ready'})

    for (let rev = 1; rev <= 150; rev++) {
      io.send(transaction(`r${rev - 1}`, `r${rev}`, [textEdit(rev)]))
    }

    io.send(transaction('r0', 'r1', [textEdit(1)]))
    vi.advanceTimersByTime(gapWait)

    expect(io.getSnapshot()).toEqual({
      value: {ready: 'synced'},
      matches: io.getSnapshot().matches,
      context: {rev: 'r150', inFlight: undefined, pending: 0},
    })
  })

  test('sends an unsent edit in one table cell rebased over a remote edit in another cell of the same table', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )
    const {io, editor, editorMessages, events} = setup()
    const loaded = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]

    io.send({type: 'load', value: loaded, rev: 'r1'})
    editor.emit({type: 'ready'})
    const localEdit = diffMatchPatch(
      'foo',
      'foox',
      cellSpanTextPath('c1', 'b1', 's1'),
    )
    const remoteEdit = diffMatchPatch(
      'bar',
      'bary',
      cellSpanTextPath('c2', 'b2', 's2'),
    )
    editor.emit({type: 'change', patches: [localEdit]})
    io.send(transaction('r1', 'r2', [remoteEdit]))
    vi.advanceTimersByTime(1_000)
    io.send({
      ...transaction('r2', 'r3', [localEdit]),
      transactionId: '00000000-0000-4000-8000-000000000001',
    })

    expect({
      editorMessages,
      events,
      snapshot: io.getSnapshot(),
    }).toEqual({
      editorMessages: [
        {type: 'load', value: loaded},
        {type: 'apply', patches: [remoteEdit]},
      ],
      events: [
        {
          type: 'mutation',
          id: '1',
          transactionId: '00000000-0000-4000-8000-000000000001',
          patches: [localEdit],
        },
      ],
      snapshot: {
        value: {ready: 'synced'},
        matches: io.getSnapshot().matches,
        context: {rev: 'r3', inFlight: undefined, pending: 0},
      },
    })
  })

  test('keeps an unsent span edit on top of a remote edit to the same span', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )
    const {io, editor, editorMessages, events} = setup()
    const spanPath = [{_key: 'b1'}, 'children', {_key: 's1'}, 'text']

    io.send({
      type: 'load',
      value: [textBlock('b1', 's1', 'foo bar')],
      rev: 'r1',
    })
    editor.emit({type: 'ready'})
    const localEdit = diffMatchPatch('foo bar', 'foo bar baz', spanPath)
    editor.emit({type: 'change', patches: [localEdit]})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('foo bar', 'qux foo bar', spanPath),
      ]),
    )
    vi.advanceTimersByTime(1_000)

    expect({editorMessages, events}).toEqual({
      editorMessages: [
        {type: 'load', value: [textBlock('b1', 's1', 'foo bar')]},
        {
          type: 'apply',
          patches: [diffMatchPatch('foo bar baz', 'qux foo bar baz', spanPath)],
        },
      ],
      events: [
        {
          type: 'mutation',
          id: '1',
          transactionId: '00000000-0000-4000-8000-000000000001',
          patches: [localEdit],
        },
      ],
    })
  })

  test('keeps an unsent span edit inside a table cell on top of a remote edit to the same span', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )
    const {io, editor, editorMessages, events} = setup()
    const spanPath = cellSpanTextPath('c1', 'b1', 's1')
    const loaded = [
      table('t1', [
        row('r1', [cell('c1', [textBlock('b1', 's1', 'foo bar')])]),
      ]),
    ]

    io.send({type: 'load', value: loaded, rev: 'r1'})
    editor.emit({type: 'ready'})
    const localEdit = diffMatchPatch('foo bar', 'foo bar baz', spanPath)
    editor.emit({type: 'change', patches: [localEdit]})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('foo bar', 'qux foo bar', spanPath),
      ]),
    )
    vi.advanceTimersByTime(1_000)

    expect({editorMessages, events}).toEqual({
      editorMessages: [
        {type: 'load', value: loaded},
        {
          type: 'apply',
          patches: [diffMatchPatch('foo bar baz', 'qux foo bar baz', spanPath)],
        },
      ],
      events: [
        {
          type: 'mutation',
          id: '1',
          transactionId: '00000000-0000-4000-8000-000000000001',
          patches: [localEdit],
        },
      ],
    })
  })

  test('sends no mutation when another writer removed the table cell of the pending change', () => {
    const {io, editor, editorMessages, events} = setup()
    const loaded = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]

    io.send({type: 'load', value: loaded, rev: 'r1'})
    editor.emit({type: 'ready'})
    const edit = diffMatchPatch(
      'foo',
      'foox',
      cellSpanTextPath('c1', 'b1', 's1'),
    )
    editor.emit({type: 'change', patches: [edit]})
    io.send(
      transaction('r1', 'r2', [
        unset([{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}]),
      ]),
    )
    vi.advanceTimersByTime(5_000)

    expect({
      editorMessages,
      events,
      value: io.getSnapshot().value,
    }).toEqual({
      editorMessages: [
        {type: 'load', value: loaded},
        {
          type: 'apply',
          patches: [
            unset([{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}]),
          ],
        },
      ],
      events: [{type: 'work dropped', patches: [edit], reason: 'no target'}],
      value: {ready: 'synced'},
    })
  })

  test('skips a remote patch into a table cell that is not there', () => {
    const {io, editor, editorMessages} = setup()
    const loaded = [
      table('t1', [row('r1', [cell('c1', [textBlock('b1', 's1', 'foo')])])]),
    ]

    io.send({type: 'load', value: loaded, rev: 'r1'})
    editor.emit({type: 'ready'})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('foo', 'foox', cellSpanTextPath('c9', 'b1', 's1')),
        set('h1', [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c9'},
          'content',
          {_key: 'b1'},
          'style',
        ]),
        unset([{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c9'}]),
      ]),
    )

    expect({
      value: io.getSnapshot().value,
      rev: io.getSnapshot().context.rev,
      editorMessages,
    }).toEqual({
      value: {ready: 'synced'},
      rev: 'r2',
      editorMessages: [{type: 'load', value: loaded}],
    })
  })

  test('skips a remote patch into an inner callout block that is not there', () => {
    const {io, editor, editorMessages} = setup()
    const loaded = [
      callout('o1', [callout('o2', [textBlock('b1', 's1', 'foo')])]),
    ]

    io.send({type: 'load', value: loaded, rev: 'r1'})
    editor.emit({type: 'ready'})
    io.send(
      transaction('r1', 'r2', [
        diffMatchPatch('foo', 'foox', [
          {_key: 'o1'},
          'content',
          {_key: 'o2'},
          'content',
          {_key: 'b9'},
          'children',
          {_key: 's1'},
          'text',
        ]),
      ]),
    )

    expect({
      value: io.getSnapshot().value,
      rev: io.getSnapshot().context.rev,
      editorMessages,
    }).toEqual({
      value: {ready: 'synced'},
      rev: 'r2',
      editorMessages: [{type: 'load', value: loaded}],
    })
  })
})

function setup() {
  const listeners = new Set<(event: EditorEventForIo) => void>()
  const editorMessages: Array<EditorMessageForIo> = []
  const editor = {
    emit(event: EditorEventForIo) {
      for (const listener of listeners) {
        listener(event)
      }
    },
  }
  const forIo: EditorForIo = {
    on: (type, listener) => {
      const typed = (event: EditorEventForIo) => {
        if (event.type === type) {
          listener(event as EditorEventForIo & {type: typeof type})
        }
      }
      listeners.add(typed)

      return {
        unsubscribe: () => {
          listeners.delete(typed)
        },
      }
    },
    send: (message) => {
      editorMessages.push(message)
    },
  }
  const io = createIo({editor: forIo, keyGenerator: () => 'k'})
  const events: Array<IoEvent> = []

  io.on('mutation', (event) => {
    events.push(event)
  })
  io.on('work dropped', (event) => {
    events.push(event)
  })

  return {io, editor, editorMessages, events}
}

function transaction(
  previousRev: string,
  resultRev: string,
  patches: Array<Patch>,
) {
  return {
    type: 'transaction' as const,
    transactionId: resultRev,
    previousRev,
    resultRev,
    patches,
  }
}

function textEdit(index: number): Patch {
  return set(`foo${index}`, [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'])
}

function textBlock(
  key: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  }
}

function cellSpanTextPath(
  cellKey: string,
  blockKey: string,
  spanKey: string,
): Path {
  return [
    {_key: 't1'},
    'rows',
    {_key: 'r1'},
    'cells',
    {_key: cellKey},
    'content',
    {_key: blockKey},
    'children',
    {_key: spanKey},
    'text',
  ]
}

function table(
  key: string,
  rows: Array<ReturnType<typeof row>>,
): PortableTextBlock {
  return {_type: 'table', _key: key, rows}
}

function row(key: string, cells: Array<ReturnType<typeof cell>>) {
  return {_type: 'row', _key: key, cells}
}

function cell(key: string, content: Array<PortableTextBlock>) {
  return {_type: 'cell', _key: key, content}
}

function callout(
  key: string,
  content: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'callout', _key: key, tone: 'info', content}
}
