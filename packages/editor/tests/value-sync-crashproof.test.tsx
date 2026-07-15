import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'
import {getTextSelection} from '../test-utils/text-selection'

const CUSTOMER_ERROR = 'node was not found'

/**
 * Capture anything that would surface a thrown error to the customer:
 * - `console.error` (what a swallowed/handled error is logged through), and
 * - genuinely *uncaught* errors: `window.onerror` and unhandled rejections.
 *
 * Browser `console.log` is not forwarded to the test runner, so findings are
 * encoded as assertions over these captured buffers.
 */
function captureErrors() {
  const consoleErrors: Array<string> = []
  const uncaught: Array<string> = []
  const originalError = console.error

  console.error = (...args: Array<unknown>) => {
    consoleErrors.push(
      args
        .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
        .join(' '),
    )
  }
  const onError = (event: ErrorEvent) => {
    uncaught.push(`window.onerror: ${event.message}`)
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    uncaught.push(`unhandledrejection: ${String(event.reason)}`)
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return {
    consoleErrors,
    uncaught,
    uncaughtCustomerErrors: () =>
      uncaught.filter((message) => message.includes(CUSTOMER_ERROR)),
    restore: () => {
      console.error = originalError
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    },
  }
}

const schema = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
})

function block(children: Array<Record<string, unknown>>): PortableTextBlock {
  return {
    _key: 'b0',
    _type: 'block',
    children,
    markDefs: [],
    style: 'normal',
  } as unknown as PortableTextBlock
}

const span = (key: string, text: string, marks: Array<string> = []) => ({
  _key: key,
  _type: 'span',
  text,
  marks,
})

type TextChild = {_key: string; _type: string; text: string}

function childrenOf(block: PortableTextBlock | undefined): Array<TextChild> {
  return ((block as unknown as {children?: Array<TextChild>})?.children ??
    []) as Array<TextChild>
}

function firstChildText(value: Array<PortableTextBlock>): string | undefined {
  return childrenOf(value[0])[0]?.text
}

describe('value sync is crash-proof against re-keyed / diverged children', () => {
  test('Scenario: a keyed unset whose target diverged from the live tree does not kill the sync actor', async () => {
    const cap = captureErrors()
    const editorEngineRef = React.createRef<PortableTextEditorEngine>()

    // Editor B loads a block whose spans carry distinct marks so the engine
    // does NOT merge them on load. `s1` is kept; `s2`/`s3`/`s4` are the spans a
    // concurrent collaborator re-keys while toggling a mark.
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator('b-'),
      schemaDefinition: schema,
      initialValue: [
        block([
          span('s1', 'A'),
          span('s2', 'B', ['strong']),
          span('s3', 'C'),
          span('s4', 'D', ['em']),
        ]),
      ],
      children: <InternalEditorEngineRefPlugin ref={editorEngineRef} />,
    })

    await vi.waitFor(() => {
      expect(editorEngineRef.current).toBeTruthy()
    })
    const editorEngine = editorEngineRef.current!

    // Simulate the divergence the customer hit: while `updateBlock` walks its
    // pre-loop `oldEngineBlock` snapshot and emits keyed unsets, a concurrent
    // change removes a sibling from the LIVE tree. We reproduce this
    // deterministically by intercepting the engine's `apply`: on the first
    // keyed children `unset`, we also remove a later-targeted sibling (`s4`).
    // The sync's own subsequent unset of `s4` then targets a `_key` that is no
    // longer present.
    //
    // Before the fix, `apply-operation` throws
    // `Cannot apply an "unset" ... because the node was not found.` from
    // OUTSIDE the sync's only try/catch, so it escapes and kills the actor.
    const originalApply = editorEngine.apply.bind(editorEngine)
    let injectedDivergence = false
    ;(editorEngine as {apply: PortableTextEditorEngine['apply']}).apply = (
      operation,
    ) => {
      const isKeyedChildUnset =
        operation.type === 'unset' &&
        operation.path.length === 3 &&
        operation.path[1] === 'children' &&
        typeof operation.path[2] === 'object'

      if (isKeyedChildUnset && !injectedDivergence) {
        const targetKey = (operation.path[2] as {_key: string})._key
        if (targetKey !== 's4') {
          injectedDivergence = true
          originalApply(operation)
          const liveBlock = editorEngine.snapshot.context.value.find(
            (node) => node._key === 'b0',
          ) as PortableTextBlock | undefined
          const stillHasS4 = childrenOf(liveBlock).some(
            (child) => child._key === 's4',
          )
          if (stillHasS4) {
            originalApply({
              type: 'unset',
              path: [{_key: 'b0'}, 'children', {_key: 's4'}],
            })
          }
          return
        }
      }

      return originalApply(operation)
    }

    // Collaborator toggled marks -> spans re-keyed (s2->r2, s3->r3, s4->r4),
    // content preserved. Delivered to B as a plain value update (the classic
    // prop-driven value-sync path).
    editor.send({
      type: 'update value',
      value: [
        block([
          span('s1', 'A'),
          span('r2', 'B', ['strong']),
          span('r3', 'C'),
          span('r4', 'D', ['em']),
        ]),
      ],
    })

    // The actor must survive: a FOLLOW-UP update still applies.
    editor.send({
      type: 'update value',
      value: [block([span('final', 'FINAL')])],
    })

    let survived = false
    try {
      await vi.waitFor(
        () => {
          expect(firstChildText(editor.getSnapshot().context.value)).toBe(
            'FINAL',
          )
        },
        {timeout: 3000},
      )
      survived = true
    } catch {
      survived = false
    }

    cap.restore()

    // (a) The customer error must not escape uncaught.
    expect(cap.uncaughtCustomerErrors()).toEqual([])
    // The fix skips the stale unset entirely, so it is not even logged.
    expect(
      cap.consoleErrors.filter((message) => message.includes(CUSTOMER_ERROR)),
    ).toEqual([])
    // (b) The sync actor survived the divergence and applied the follow-up.
    expect(survived).toBe(true)
    expect(editor.getSnapshot().context.value).toEqual([
      block([span('final', 'FINAL', [])]),
    ])
  })

  test('Scenario: a real concurrent decorator toggle re-keys spans and B converges + keeps syncing', async () => {
    const cap = captureErrors()

    // Editor A produces the re-keyed value by toggling a decorator on a
    // sub-range of a single span (this splits + re-keys the spans).
    const {editor: editorA} = await createTestEditor({
      keyGenerator: createTestKeyGenerator('a-'),
      schemaDefinition: schema,
      initialValue: [block([span('a-s1', 'foo bar baz')])],
    })

    editorA.send({
      type: 'decorator.toggle',
      decorator: 'strong',
      at: getTextSelection(editorA.getSnapshot().context, 'bar'),
    })

    let rekeyedValue: Array<PortableTextBlock> = []
    await vi.waitFor(() => {
      rekeyedValue = editorA.getSnapshot().context
        .value as Array<PortableTextBlock>
      expect(childrenOf(rekeyedValue[0]).length).toBe(3)
    })

    // Editor B starts from the same original value and only receives A's
    // re-keyed value through `update value`.
    const {editor: editorB} = await createTestEditor({
      keyGenerator: createTestKeyGenerator('b-'),
      schemaDefinition: schema,
      initialValue: [block([span('a-s1', 'foo bar baz')])],
    })

    editorB.send({type: 'update value', value: rekeyedValue})

    await vi.waitFor(() => {
      expect(editorB.getSnapshot().context.value).toEqual(rekeyedValue)
    })

    // Follow-up update still applies (actor alive).
    editorB.send({
      type: 'update value',
      value: [block([span('a-s1', 'changed')])],
    })
    await vi.waitFor(() => {
      expect(firstChildText(editorB.getSnapshot().context.value)).toBe(
        'changed',
      )
    })

    cap.restore()
    expect(cap.uncaughtCustomerErrors()).toEqual([])
    expect(
      cap.consoleErrors.filter((message) => message.includes(CUSTOMER_ERROR)),
    ).toEqual([])
  })
})
