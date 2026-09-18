import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'studio',

  projectId: 'e2sapjbh',
  dataset: 'scratch',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})
