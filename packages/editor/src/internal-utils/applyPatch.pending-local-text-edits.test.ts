import {diffMatchPatch} from '@portabletext/patches'
import {compileSchema, defineSchema} from '@portabletext/schema'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createApplyPatch} from './applyPatch'
import {createTestSnapshot} from './build-index-maps'
import {
  getPendingLocalTextEditsKey,
  type PendingLocalTextEdit,
} from './pending-local-text-edits'

const schema = compileSchema(defineSchema({}))
const blockKey = 'block'
const spanKey = 'span'
const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}] as const
const textPath = [...spanPath, 'text'] as const
const pendingKey = getPendingLocalTextEditsKey(spanPath)

describe('createApplyPatch pending local text edits', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('merges a remote patch against the pending base and refreshes expiry', () => {
    const {applyPatch, editor, getSpanText} = createHarness({
      baseText: 'ab',
      liveText: 'aXb',
      lastEditTime: 100,
    })

    const changed = applyPatch(
      editor,
      diffMatchPatch('ab', 'aYb', [...textPath]),
    )

    expect(changed).toBe(true)
    expect(getSpanText()).toBe('aXYb')
    expect(editor.pendingLocalTextEdits.get(pendingKey)).toEqual({
      path: [...spanPath],
      baseText: 'aYb',
      lastEditTime: 1_000,
    })
  })

  test('acknowledges a live-only patch when the base source is missing', () => {
    const {applyPatch, editor, getSpanText} = createHarness({
      baseText: 'ab',
      liveText: 'aXb',
      lastEditTime: 100,
    })

    const changed = applyPatch(
      editor,
      diffMatchPatch('aXb', 'aXb!', [...textPath]),
    )

    expect(changed).toBe(true)
    expect(getSpanText()).toBe('aXb!')
    expect(editor.pendingLocalTextEdits.size).toBe(0)
  })

  test('keeps the pending base when the base match is ambiguous', () => {
    const {applyPatch, editor, getSpanText} = createHarness({
      baseText: 'target__target',
      liveText: 'target__target!',
      lastEditTime: 100,
    })

    const [patch] = makePatches(makeDiff('target', 'changed'))
    const ambiguousPatch = {
      type: 'diffMatchPatch' as const,
      path: [...textPath],
      value: stringifyPatches([
        {
          ...patch!,
          start1: 4,
          start2: 4,
          utf8Start1: 4,
          utf8Start2: 4,
        },
      ]),
      origin: 'remote' as const,
    }

    const changed = applyPatch(editor, ambiguousPatch)

    expect(changed).toBe(false)
    expect(getSpanText()).toBe('target__target!')
    expect(editor.pendingLocalTextEdits.get(pendingKey)).toEqual({
      path: [...spanPath],
      baseText: 'target__target',
      lastEditTime: 100,
    })
  })

  test('keeps the pending base when no candidate can be applied', () => {
    const {applyPatch, editor, getSpanText} = createHarness({
      baseText: 'ab',
      liveText: 'aXb',
      lastEditTime: 100,
    })

    const changed = applyPatch(
      editor,
      diffMatchPatch(
        'COMPLETELY_UNIQUE_SOURCE_STRING_XYZ_999',
        'COMPLETELY_UNIQUE_TARGET_STRING_XYZ_999',
        [...textPath],
      ),
    )

    expect(changed).toBe(false)
    expect(getSpanText()).toBe('aXb')
    expect(editor.pendingLocalTextEdits.get(pendingKey)).toEqual({
      path: [...spanPath],
      baseText: 'ab',
      lastEditTime: 100,
    })
  })
})

function createHarness(options: {
  baseText: string
  liveText: string
  lastEditTime: number
}) {
  const value = [
    {
      _key: blockKey,
      _type: 'block' as const,
      children: [
        {
          _key: spanKey,
          _type: 'span' as const,
          text: options.liveText,
          marks: [] as string[],
        },
      ],
      markDefs: [] as Array<{_key: string; _type: string}>,
      style: 'normal',
    },
  ]
  const snapshot = createTestSnapshot({schema, value})
  const pendingLocalTextEdits = new Map<string, PendingLocalTextEdit>([
    [
      pendingKey,
      {
        path: [...spanPath],
        baseText: options.baseText,
        lastEditTime: options.lastEditTime,
      },
    ],
  ])

  const editor = {
    snapshot,
    pendingLocalTextEdits,
    apply: (operation: {
      type: string
      path: ReadonlyArray<unknown>
      offset?: number
      text?: string
    }) => {
      const span = value[0]!.children[0]!
      if (operation.type === 'insert.text' && operation.text !== undefined) {
        const offset = operation.offset ?? 0
        span.text =
          span.text.slice(0, offset) + operation.text + span.text.slice(offset)
        return
      }
      if (operation.type === 'remove.text' && operation.text !== undefined) {
        const offset = operation.offset ?? 0
        span.text =
          span.text.slice(0, offset) +
          span.text.slice(offset + operation.text.length)
      }
    },
    onChange: () => {},
    containers: snapshot.context.containers,
  } as unknown as PortableTextEditorEngine

  return {
    editor,
    applyPatch: createApplyPatch({
      schema,
      keyGenerator: () => 'key',
      initialValue: value,
    }),
    getSpanText: () => value[0]!.children[0]!.text,
  }
}
