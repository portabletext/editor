import {expect, test} from '@playwright/experimental-ct-react'
import {App} from '../App'

test('Scenario: Writing in one editor and reading it in another', async ({mount}) => {
  const component = await mount(<App />)

  const editor0 = component.getByTestId('editor-0')
  const editor1 = component.getByTestId('editor-1')
  const editor0Editable = editor0.locator('[contenteditable="true"]')
  const editor1Editable = editor1.locator('[contenteditable="true"]')

  await editor0Editable.fill('foo')

  await expect(editor1Editable).toContainText('foo')
})
