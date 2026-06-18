import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

// `TextString` reconciles the DOM text node against the model on every render
// via a dependency-less layout effect. React Compiler compiles `string.tsx`
// in this build, and would otherwise memoize `EngineString`'s `<TextString>`
// element on the unchanged leaf text, skip the re-render, and skip the
// reconcile. `EngineString`/`TextString` carry a `"use no memo"` directive so
// that cannot happen. This test exercises the path that exposed it: a native
// single-character insertion lands in the focus span while a pending decorator
// toggle routes the model insert into a new span, so the focus span's DOM text
// diverges from its model text and only the reconcile effect can fix it.
describe('string reconcile under react compiler', () => {
  test('Scenario: a native edit that diverges from the model is reconciled away', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo[strong:bar|]',
      )
    })

    expect(locator.element().textContent).toEqual('foobar')
  })
})
