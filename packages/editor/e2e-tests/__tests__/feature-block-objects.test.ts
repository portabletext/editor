/** @jest-environment ./setup/collaborative.jest.env.ts */
import {expect} from '@jest/globals'

import featureFile from './block-objects.feature'
import {defineStep, Feature} from './gherkin-driver'
import {getEditorText, insertEditorText} from './step-helpers.test'

Feature(featureFile, [
  defineStep('the text {string}', async ({editorA}, text: string) => {
    await insertEditorText(editorA, text)
  }),
  defineStep('an image', async ({editorA}) => {
    await editorA.pressButton('insert-image')
  }),
  defineStep('{string} is typed', async ({editorA}, text: string) => {
    await editorA.type(text)
  }),
  defineStep('{button} is pressed', async ({editorA}, button: string) => {
    await editorA.pressKey(button)
  }),
  defineStep('editors have settled', async () => {
    await waitForRevision()
  }),
  defineStep('the text is {text}', async ({editorA}, text: string) => {
    await getEditorText(editorA).then((actualText) => expect(actualText).toEqual(text))
  }),
])
