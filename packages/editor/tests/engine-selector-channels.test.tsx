import {useContext, useEffect, useMemo, useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineBlockObject} from '../src'
import type {Editor} from '../src/engine/interfaces/editor'
import {
  EngineSelectorContext,
  useListIndexSelector,
  useRegistrationsSelector,
} from '../src/engine/react/hooks/use-engine-selector'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

const selectorRuns = {default: 0, registrations: 0, listIndex: 0}

// Module-level selectors have stable identities, so they only run on
// mount and when their channel is notified, never on unrelated renders.
function registrationsSelector(_engine: Editor) {
  selectorRuns.registrations++
  return null
}

function listIndexSelector(_engine: Editor) {
  selectorRuns.listIndex++
  return null
}

let mountLateNodePlugin: (() => void) | undefined

function ChannelProbe() {
  // The every-change set has no selector hook anymore (`useEngine` is
  // its only production subscriber), so the probe subscribes a raw
  // listener to pin that unscoped listeners still fire per change.
  const {addEventListener} = useContext(EngineSelectorContext)
  useEffect(
    () =>
      addEventListener(() => {
        selectorRuns.default++
      }),
    [addEventListener],
  )
  useRegistrationsSelector(registrationsSelector)
  useListIndexSelector(listIndexSelector)

  const [latePluginMounted, setLatePluginMounted] = useState(false)
  mountLateNodePlugin = () => setLatePluginMounted(true)
  const lateNodes = useMemo(
    () => [defineBlockObject({type: 'late-object'})],
    [],
  )

  return latePluginMounted ? <NodePlugin nodes={lateNodes} /> : null
}

describe('engine selector channels', () => {
  test('Scenario: Text and selection ops leave channel-scoped selectors alone', async () => {
    const {editor} = await createTestEditor({children: <ChannelProbe />})

    editor.send({
      type: 'insert.blocks',
      placement: 'auto',
      blocks: Array.from({length: 3}, (_, index) => ({
        _type: 'block',
        _key: `b${index}`,
        children: [
          {_type: 'span', _key: `s${index}`, text: `b${index}`, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })),
    })
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    const afterSetup = {...selectorRuns}

    editor.send({type: 'insert.text', text: 'x'})
    await vi.waitFor(() => {
      expect(selectorRuns.default).toBeGreaterThan(afterSetup.default)
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Typing and moving the caret cannot change registration maps or
    // list indices, so those selectors must not have run.
    expect(selectorRuns.registrations).toBe(afterSetup.registrations)
    expect(selectorRuns.listIndex).toBe(afterSetup.listIndex)

    const afterTyping = {...selectorRuns}

    // A structural op (block split) can shift list indices.
    editor.send({type: 'insert.break'})
    await vi.waitFor(() => {
      expect(selectorRuns.listIndex).toBeGreaterThan(afterTyping.listIndex)
    })
    expect(selectorRuns.registrations).toBe(afterTyping.registrations)

    const afterBreak = {...selectorRuns}

    // Registering a renderer arms the registrations channel.
    mountLateNodePlugin?.()
    await vi.waitFor(() => {
      expect(selectorRuns.registrations).toBeGreaterThan(
        afterBreak.registrations,
      )
    })
  })
})
