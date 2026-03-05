import {defineSchema} from '@portabletext/schema'
import {Given} from 'racejar'
import type {Context} from '../test/vitest/step-context'
import {createTestEditorsWithYjs} from './test-editor-with-yjs'

const schemaDefinition = defineSchema({
  annotations: [{name: 'comment'}, {name: 'link'}],
  decorators: [{name: 'em'}, {name: 'strong'}],
  blockObjects: [{name: 'image'}, {name: 'break'}],
  inlineObjects: [{name: 'stock-ticker'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
})

export const yjsStepDefinitions = [
  Given('two editors with Yjs sync', async (context: Context) => {
    const {editor, locator, editorB, locatorB} = await createTestEditorsWithYjs(
      {
        schemaDefinition,
      },
    )

    context.locator = locator
    context.editor = editor
    context.locatorB = locatorB
    context.editorB = editorB
  }),
]
