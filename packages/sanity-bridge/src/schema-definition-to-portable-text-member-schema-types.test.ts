import type {Schema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {portableTextMemberSchemaTypesToSchema} from './portable-text-member-schema-types-to-schema'
import {compileSchemaDefinitionToPortableTextMemberSchemaTypes} from './schema-definition-to-portable-text-member-schema-types'

describe(compileSchemaDefinitionToPortableTextMemberSchemaTypes.name, () => {
  test("image object doesn't get Sanity-specific fields", () => {
    expect(
      compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'image'}],
      }).blockObjects,
    ).toMatchObject([
      {
        name: 'image',
        fields: [],
      },
    ])

    expect(
      compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }).blockObjects,
    ).toMatchObject([
      {
        name: 'image',
        fields: [
          {
            name: 'src',
            type: {
              jsonType: 'string',
            },
          },
        ],
      },
    ])
  })

  test('back and forth test', () => {
    const schema: Schema = {
      annotations: [
        {
          name: 'link',
          fields: [
            {
              name: 'href',
              type: 'string',
              title: 'URL',
            },
          ],
          title: 'Link',
        },
        {
          name: 'canvasComment',
          fields: [
            {
              name: 'commentId',
              type: 'string',
              title: 'Comment ID',
            },
          ],
          title: 'Comment',
        },
        {
          name: 'canvasMapping',
          fields: [
            {
              name: 'documentPath',
              type: 'string',
              title: 'Document path',
            },
            {
              name: 'typePath',
              type: 'string',
              title: 'Type path',
            },
            {
              name: 'locked',
              type: 'boolean',
              title: 'Locked',
            },
          ],
          title: 'Mapping',
        },
      ],
      block: {
        name: 'block',
      },
      blockObjects: [
        {
          name: 'canvasDivider',
          fields: [
            {
              name: 'orientation',
              type: 'string',
              title: 'Orientation',
            },
          ],
          title: 'Divider',
        },
        {
          name: 'canvasFile',
          fields: [
            {
              name: 'asset',
              type: 'object',
              title: 'Asset',
            },
            {
              name: 'media',
              type: 'object',
              title: 'Media',
            },
            {
              name: 'title',
              type: 'string',
              title: 'Title',
            },
            {
              name: 'filename',
              type: 'string',
              title: 'Filename',
            },
            {
              name: 'type',
              type: 'string',
              title: 'Type',
            },
            {
              name: 'summary',
              type: 'string',
              title: 'Summary',
            },
            {
              name: 'large',
              type: 'boolean',
              title: 'Large',
            },
          ],
          title: 'File',
        },
        {
          name: 'canvasImage',
          fields: [
            {
              name: 'asset',
              type: 'object',
              title: 'Asset',
            },
            {
              name: 'media',
              type: 'object',
              title: 'Media',
            },
            {
              name: 'hotspot',
              type: 'object',
              title: 'Hotspot',
            },
            {
              name: 'crop',
              type: 'object',
              title: 'Crop',
            },
            {
              name: 'title',
              type: 'string',
              title: 'Title',
            },
            {
              name: 'alt',
              type: 'string',
              title: 'Alt',
            },
            {
              name: 'imageDimensions',
              type: 'object',
              title: 'Image Dimensions',
            },
            {
              name: 'sourceImageId',
              type: 'string',
              title: 'Source Image Id',
            },
          ],
          title: 'Image',
        },
        {
          name: 'canvasUrlBlock',
          fields: [
            {
              name: 'url',
              type: 'string',
              title: 'Url',
            },
            {
              name: 'title',
              type: 'string',
              title: 'Title',
            },
            {
              name: 'favicon',
              type: 'string',
              title: 'Favicon',
            },
            {
              name: 'description',
              type: 'string',
              title: 'Description',
            },
            {
              name: 'content',
              type: 'array',
              title: 'Content',
            },
            {
              name: 'error',
              type: 'string',
              title: 'Error',
            },
          ],
          title: 'Url block',
        },
        {
          name: 'canvasAiTask',
          fields: [
            {
              name: 'instruction',
              type: 'string',
              title: 'Instruction',
            },
            {
              name: 'input',
              type: 'array',
              title: 'Input',
            },
          ],
          title: 'AI task',
        },
        {
          name: 'canvasCode',
          fields: [
            {
              name: 'language',
              type: 'string',
              title: 'Language',
            },
            {
              name: 'code',
              type: 'array',
              title: 'Code',
            },
            {
              name: 'suggestions',
              type: 'object',
              title: 'Suggestions',
            },
          ],
          title: 'Code',
        },
        {
          name: 'canvasGlobalRef',
          fields: [
            {
              name: 'target',
              type: 'object',
              title: 'Target',
            },
          ],
          title: 'Reference for mapping',
        },
        {
          name: 'canvasPlaceholder',
          fields: [
            {
              name: 'title',
              type: 'string',
              title: 'Title',
            },
            {
              name: 'data',
              type: 'string',
              title: 'Data',
            },
            {
              name: 'map',
              type: 'object',
              title: 'Map',
            },
          ],
          title: 'Placeholder block',
        },
      ],
      decorators: [
        {
          name: 'strong',
          title: 'Bold',
          value: 'strong',
        },
        {
          name: 'em',
          title: 'Italic',
          value: 'em',
        },
        {
          name: 'strike-through',
          title: 'Strike',
          value: 'strike-through',
        },
        {
          name: 'code',
          title: 'Code',
          value: 'code',
        },
      ],
      inlineObjects: [],
      span: {
        name: 'span',
      },
      styles: [
        {
          name: 'normal',
          title: 'Text',
          value: 'normal',
        },
        {
          name: 'h1',
          title: 'Heading 1',
          value: 'h1',
        },
        {
          name: 'h2',
          title: 'Heading 2',
          value: 'h2',
        },
        {
          name: 'h3',
          title: 'Heading 3',
          value: 'h3',
        },
        {
          name: 'h4',
          title: 'Heading 4',
          value: 'h4',
        },
        {
          name: 'h5',
          title: 'Heading 5',
          value: 'h5',
        },
        {
          name: 'h6',
          title: 'Heading 6',
          value: 'h6',
        },
        {
          name: 'blockquote',
          title: 'Blockquote',
          value: 'blockquote',
        },
      ],
      lists: [
        {
          name: 'number',
          title: 'Numbered list',
          value: 'number',
        },
        {
          name: 'bullet',
          title: 'Bulleted list',
          value: 'bullet',
        },
      ],
    }

    expect(
      portableTextMemberSchemaTypesToSchema(
        compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
      ),
    ).toEqual(schema)
  })
})
