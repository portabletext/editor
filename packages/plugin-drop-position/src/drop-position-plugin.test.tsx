import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {page} from 'vitest/browser'
import {DropPositionPlugin, useDropPosition} from './index'

function Probe() {
  const dropPosition = useDropPosition([{_key: 'k0'}])
  return <span data-testid="probe">{String(dropPosition)}</span>
}

describe('plugin-drop-position public API surface', () => {
  test('useDropPosition returns undefined without DropPositionPlugin mounted', async () => {
    await createTestEditor({
      children: <Probe />,
      schemaDefinition: defineSchema({}),
    })
    await expect
      .element(page.getByTestId('probe'))
      .toHaveTextContent('undefined')
  })

  test('useDropPosition returns undefined when DropPositionPlugin is mounted but no drag is in flight', async () => {
    await createTestEditor({
      children: (
        <DropPositionPlugin>
          <Probe />
        </DropPositionPlugin>
      ),
      schemaDefinition: defineSchema({}),
    })
    await expect
      .element(page.getByTestId('probe'))
      .toHaveTextContent('undefined')
  })
})
