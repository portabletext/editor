import {useContext, useEffect, useMemo, useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineBlockObject} from '../src'
import type {Editor} from '../src/engine/interfaces/editor'
import {
  EngineSelectorContext,
  useRegistrationsSelector,
} from '../src/engine/react/hooks/use-engine-selector'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

const selectorRuns = {default: 0}
const registrationsSelectorRuns: Array<{lateObjectRegistered: boolean}> = []

// Module-level selectors have stable identities, so they only run on
// mount and when their channel is notified, never on unrelated renders.
function registrationsSelector(engine: Editor) {
  registrationsSelectorRuns.push({
    lateObjectRegistered: engine.blockObjects.has('late-object'),
  })
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
    registrationsSelectorRuns.length = 0
    const {editor, locator} = await createTestEditor({
      children: <ChannelProbe />,
    })

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
    // Focus restores the model selection in the DOM, so the inserted
    // blocks must have rendered first.
    await expect
      .element(locator.getByText('b1', {exact: true}))
      .toBeInTheDocument()
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 2},
      },
    })
    await expect.element(locator).toHaveFocus()

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

    // Typing and moving the caret cannot change registration maps, so
    // the registrations selector must not have run. Registering a
    // renderer arms the registrations channel.
    mountLateNodePlugin?.()
    await vi.waitFor(() => {
      expect(registrationsSelectorRuns).toEqual([
        {lateObjectRegistered: false},
        {lateObjectRegistered: false},
        {lateObjectRegistered: true},
      ])
    })
  })
})
