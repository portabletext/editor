import {diffMatchPatch, set, type Patch} from '@portabletext/patches'
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
