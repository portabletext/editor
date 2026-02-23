import type {Schema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {portableTextMemberSchemaTypesToSchema} from './portable-text-member-schema-types-to-schema'
import {compileSchemaDefinitionToPortableTextMemberSchemaTypes} from './schema-definition-to-portable-text-member-schema-types'

describe(compileSchemaDefinitionToPortableTextMemberSchemaTypes.name, () => {
  test('handles type appearing in both blockObjects and inlineObjects', () => {
    const schema: Schema = {
      annotations: [],
      block: {name: 'block'},
      blockObjects: [
        {
          name: 'test',
          fields: [{name: 'title', type: 'string', title: 'Title'}],
          title: 'Test',
        },
      ],
      decorators: [],
      inlineObjects: [
        {
          name: 'test',
          fields: [{name: 'title', type: 'string', title: 'Title'}],
          title: 'Test',
        },
      ],
      span: {name: 'span'},
      styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
      lists: [],
    }

    expect(
      portableTextMemberSchemaTypesToSchema(
        compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
      ),
    ).toEqual(schema)
  })

  test('back and forth with shared blockObject and inlineObject names', () => {
    const schema: Schema = {
      annotations: [],
      block: {name: 'block'},
      blockObjects: [
        {
          name: 'myObject',
          fields: [{name: 'value', type: 'string', title: 'Value'}],
          title: 'My Object',
        },
      ],
      decorators: [{name: 'strong', title: 'Bold', value: 'strong'}],
      inlineObjects: [
        {
          name: 'myObject',
          fields: [{name: 'value', type: 'string', title: 'Value'}],
          title: 'My Object',
        },
      ],
      span: {name: 'span'},
      styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
      lists: [],
    }

    expect(
      portableTextMemberSchemaTypesToSchema(
        compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
      ),
    ).toEqual(schema)
  })

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

  // --- Built-in name collision tests ---

  describe('built-in name collisions', () => {
    test("file blockObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'file'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'file', fields: []}])
    })

    test('file blockObject with custom fields preserves them', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'file', fields: [{name: 'url', type: 'string'}]}],
      })
      expect(result.blockObjects).toMatchObject([
        {
          name: 'file',
          fields: [{name: 'url', type: {jsonType: 'string'}}],
        },
      ])
    })

    test("slug blockObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'slug'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'slug', fields: []}])
    })

    test("geopoint blockObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'geopoint'}],
      })
      expect(result.blockObjects).toMatchObject([
        {name: 'geopoint', fields: []},
      ])
    })

    test("url blockObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'url'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'url', fields: []}])
    })

    test("image inlineObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'image'}],
      })
      expect(result.inlineObjects).toMatchObject([{name: 'image', fields: []}])
    })

    test("file inlineObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'file'}],
      })
      expect(result.inlineObjects).toMatchObject([{name: 'file', fields: []}])
    })

    test("slug inlineObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'slug'}],
      })
      expect(result.inlineObjects).toMatchObject([{name: 'slug', fields: []}])
    })

    test("geopoint inlineObject doesn't get Sanity-specific fields", () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'geopoint'}],
      })
      expect(result.inlineObjects).toMatchObject([
        {name: 'geopoint', fields: []},
      ])
    })

    test('built-in name as both blockObject and inlineObject', () => {
      const schema: Schema = {
        annotations: [],
        block: {name: 'block'},
        blockObjects: [{name: 'image', fields: [], title: 'Image'}],
        decorators: [],
        inlineObjects: [{name: 'image', fields: [], title: 'Image'}],
        span: {name: 'span'},
        styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
        lists: [],
      }

      expect(
        portableTextMemberSchemaTypesToSchema(
          compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
        ),
      ).toEqual(schema)
    })

    test('multiple built-in names in the same schema', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
          {name: 'file', fields: [{name: 'url', type: 'string'}]},
        ],
        inlineObjects: [
          {name: 'slug', fields: [{name: 'current', type: 'string'}]},
          {name: 'geopoint', fields: [{name: 'lat', type: 'number'}]},
        ],
      })

      expect(result.blockObjects).toMatchObject([
        {name: 'image', fields: [{name: 'src'}]},
        {name: 'file', fields: [{name: 'url'}]},
      ])
      expect(result.inlineObjects).toMatchObject([
        {name: 'slug', fields: [{name: 'current'}]},
        {name: 'geopoint', fields: [{name: 'lat'}]},
      ])
    })
  })

  // --- Inline object type.name restoration ---

  describe('inline object type.name restoration', () => {
    test('shared name: inlineObject.type.name is restored', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'widget'}],
        inlineObjects: [{name: 'widget'}],
      })

      for (const inlineObject of result.inlineObjects) {
        if (inlineObject.name === 'widget') {
          expect(inlineObject.type?.name).toBe('widget')
        }
      }
    })

    test('built-in name: inlineObject.type.name is restored', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'image'}],
      })

      for (const inlineObject of result.inlineObjects) {
        if (inlineObject.name === 'image') {
          expect(inlineObject.type?.name).toBe('image')
        }
      }
    })

    test('blockObject.type.name is restored for shared names', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'widget'}],
        inlineObjects: [{name: 'widget'}],
      })

      for (const blockObject of result.blockObjects) {
        if (blockObject.name === 'widget') {
          expect(blockObject.type?.name).toBe('widget')
        }
      }
    })
  })

  // --- Minimal schemas ---

  describe('minimal schemas', () => {
    test('empty definition compiles without error', () => {
      expect(() =>
        compileSchemaDefinitionToPortableTextMemberSchemaTypes(undefined),
      ).not.toThrow()
    })

    test('empty object definition compiles without error', () => {
      expect(() =>
        compileSchemaDefinitionToPortableTextMemberSchemaTypes({}),
      ).not.toThrow()
    })

    test('minimal schema with only styles', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        styles: [{name: 'normal', title: 'Normal'}],
      })
      expect(result.styles).toMatchObject([{value: 'normal'}])
      expect(result.blockObjects).toEqual([])
      expect(result.inlineObjects).toEqual([])
    })

    test('schema with no decorators', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        decorators: [],
      })
      expect(result.decorators).toEqual([])
    })

    test('schema with no annotations', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        annotations: [],
      })
      expect(result.annotations).toEqual([])
    })

    test('schema with no lists', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        lists: [],
      })
      expect(result.lists).toEqual([])
    })

    test('schema with only blockObjects', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'divider'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'divider'}])
      expect(result.inlineObjects).toEqual([])
    })

    test('schema with only inlineObjects', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'emoji'}],
      })
      expect(result.inlineObjects).toMatchObject([{name: 'emoji'}])
      expect(result.blockObjects).toEqual([])
    })
  })

  // --- Annotations ---

  describe('annotations', () => {
    test('annotation with no fields', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        annotations: [{name: 'highlight'}],
      })
      expect(result.annotations).toMatchObject([
        {name: 'highlight', fields: []},
      ])
    })

    test('annotation with multiple fields', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        annotations: [
          {
            name: 'link',
            fields: [
              {name: 'href', type: 'string'},
              {name: 'target', type: 'string'},
            ],
          },
        ],
      })
      expect(result.annotations).toMatchObject([
        {
          name: 'link',
          fields: [
            {name: 'href', type: {jsonType: 'string'}},
            {name: 'target', type: {jsonType: 'string'}},
          ],
        },
      ])
    })

    test('multiple annotations', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        annotations: [
          {name: 'link', fields: [{name: 'href', type: 'string'}]},
          {name: 'comment', fields: [{name: 'id', type: 'string'}]},
          {name: 'highlight'},
        ],
      })
      expect(result.annotations).toHaveLength(3)
      expect(result.annotations.map((a) => a.name)).toEqual([
        'link',
        'comment',
        'highlight',
      ])
    })
  })

  // --- Title inference ---

  describe('title inference', () => {
    test('blockObject without title gets startCase title', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'myCustomBlock'}],
      })
      expect(result.blockObjects).toMatchObject([
        {name: 'myCustomBlock', title: 'My Custom Block'},
      ])
    })

    test('inlineObject without title gets startCase title', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects: [{name: 'inlineEmoji'}],
      })
      expect(result.inlineObjects).toMatchObject([
        {name: 'inlineEmoji', title: 'Inline Emoji'},
      ])
    })

    test('image blockObject without title gets "Image"', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'image'}],
      })
      expect(result.blockObjects).toMatchObject([
        {name: 'image', title: 'Image'},
      ])
    })

    test('url blockObject without title gets "URL"', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'url'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'url', title: 'URL'}])
    })

    test('explicit title overrides default', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'image', title: 'Photo'}],
      })
      expect(result.blockObjects).toMatchObject([
        {name: 'image', title: 'Photo'},
      ])
    })

    test('decorator without title gets startCase title', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        decorators: [{name: 'strike-through'}],
      })
      expect(result.decorators).toMatchObject([
        {value: 'strike-through', title: 'Strike Through'},
      ])
    })

    test('style without title gets startCase title', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        styles: [{name: 'normal'}, {name: 'blockquote'}],
      })
      expect(result.styles).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            value: 'blockquote',
            title: 'Blockquote',
          }),
        ]),
      )
    })

    test('list without title gets startCase title', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        lists: [{name: 'bullet'}],
      })
      expect(result.lists).toMatchObject([{value: 'bullet', title: 'Bullet'}])
    })
  })

  // --- Round-trip tests ---

  describe('round-trip (schema -> compile -> convert back)', () => {
    test('minimal schema round-trips', () => {
      const schema: Schema = {
        annotations: [],
        block: {name: 'block'},
        blockObjects: [],
        decorators: [],
        inlineObjects: [],
        span: {name: 'span'},
        styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
        lists: [],
      }

      expect(
        portableTextMemberSchemaTypesToSchema(
          compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
        ),
      ).toEqual(schema)
    })

    test('schema with all feature types round-trips', () => {
      const schema: Schema = {
        annotations: [
          {
            name: 'link',
            fields: [{name: 'href', type: 'string', title: 'URL'}],
            title: 'Link',
          },
        ],
        block: {name: 'block'},
        blockObjects: [
          {
            name: 'divider',
            fields: [{name: 'style', type: 'string', title: 'Style'}],
            title: 'Divider',
          },
        ],
        decorators: [
          {name: 'strong', title: 'Bold', value: 'strong'},
          {name: 'em', title: 'Italic', value: 'em'},
        ],
        inlineObjects: [
          {
            name: 'emoji',
            fields: [{name: 'code', type: 'string', title: 'Code'}],
            title: 'Emoji',
          },
        ],
        span: {name: 'span'},
        styles: [
          {name: 'normal', title: 'Normal', value: 'normal'},
          {name: 'h1', title: 'Heading 1', value: 'h1'},
        ],
        lists: [
          {name: 'bullet', title: 'Bullet', value: 'bullet'},
          {name: 'number', title: 'Number', value: 'number'},
        ],
      }

      expect(
        portableTextMemberSchemaTypesToSchema(
          compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
        ),
      ).toEqual(schema)
    })

    test('schema with built-in names round-trips', () => {
      const schema: Schema = {
        annotations: [],
        block: {name: 'block'},
        blockObjects: [
          {name: 'image', fields: [], title: 'Image'},
          {name: 'file', fields: [], title: 'File'},
        ],
        decorators: [],
        inlineObjects: [
          {name: 'slug', fields: [], title: 'Slug'},
          {name: 'geopoint', fields: [], title: 'Geopoint'},
        ],
        span: {name: 'span'},
        styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
        lists: [],
      }

      expect(
        portableTextMemberSchemaTypesToSchema(
          compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
        ),
      ).toEqual(schema)
    })

    test('schema with shared names and built-in names round-trips', () => {
      const schema: Schema = {
        annotations: [],
        block: {name: 'block'},
        blockObjects: [
          {name: 'image', fields: [], title: 'Image'},
          {
            name: 'widget',
            fields: [{name: 'id', type: 'string', title: 'Id'}],
            title: 'Widget',
          },
        ],
        decorators: [],
        inlineObjects: [
          {name: 'image', fields: [], title: 'Image'},
          {
            name: 'widget',
            fields: [{name: 'id', type: 'string', title: 'Id'}],
            title: 'Widget',
          },
        ],
        span: {name: 'span'},
        styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
        lists: [],
      }

      expect(
        portableTextMemberSchemaTypesToSchema(
          compileSchemaDefinitionToPortableTextMemberSchemaTypes(schema),
        ),
      ).toEqual(schema)
    })
  })

  // --- Stress tests ---

  describe('stress tests', () => {
    test('many blockObjects', () => {
      const blockObjects = Array.from({length: 20}, (_, i) => ({
        name: `blockType${i}`,
        fields: [{name: 'value', type: 'string' as const}],
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects,
      })

      expect(result.blockObjects).toHaveLength(20)
      for (let i = 0; i < 20; i++) {
        expect(result.blockObjects[i]!.name).toBe(`blockType${i}`)
      }
    })

    test('many inlineObjects', () => {
      const inlineObjects = Array.from({length: 20}, (_, i) => ({
        name: `inlineType${i}`,
        fields: [{name: 'value', type: 'string' as const}],
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        inlineObjects,
      })

      expect(result.inlineObjects).toHaveLength(20)
      for (let i = 0; i < 20; i++) {
        expect(result.inlineObjects[i]!.name).toBe(`inlineType${i}`)
      }
    })

    test('many decorators', () => {
      const decorators = Array.from({length: 10}, (_, i) => ({
        name: `decorator${i}`,
        title: `Decorator ${i}`,
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        decorators,
      })

      expect(result.decorators).toHaveLength(10)
    })

    test('many annotations', () => {
      const annotations = Array.from({length: 10}, (_, i) => ({
        name: `annotation${i}`,
        fields: [{name: 'value', type: 'string' as const}],
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        annotations,
      })

      expect(result.annotations).toHaveLength(10)
    })

    test('many styles', () => {
      const styles = [
        {name: 'normal', title: 'Normal'},
        ...Array.from({length: 9}, (_, i) => ({
          name: `style${i}`,
          title: `Style ${i}`,
        })),
      ]

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        styles,
      })

      expect(result.styles).toHaveLength(10)
    })

    test('many lists', () => {
      const lists = Array.from({length: 5}, (_, i) => ({
        name: `list${i}`,
        title: `List ${i}`,
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        lists,
      })

      expect(result.lists).toHaveLength(5)
    })

    test('many shared names between blockObjects and inlineObjects', () => {
      const names = Array.from({length: 10}, (_, i) => `shared${i}`)

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: names.map((name) => ({
          name,
          fields: [{name: 'value', type: 'string' as const}],
        })),
        inlineObjects: names.map((name) => ({
          name,
          fields: [{name: 'value', type: 'string' as const}],
        })),
      })

      expect(result.blockObjects).toHaveLength(10)
      expect(result.inlineObjects).toHaveLength(10)

      for (const name of names) {
        expect(result.blockObjects.find((bo) => bo.name === name)).toBeDefined()
        expect(
          result.inlineObjects.find((io) => io.name === name),
        ).toBeDefined()
      }
    })
  })

  // --- Field handling ---

  describe('field handling', () => {
    test('object with no fields', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'divider'}],
      })
      expect(result.blockObjects).toMatchObject([{name: 'divider', fields: []}])
    })

    test('object with many fields', () => {
      const fields = Array.from({length: 10}, (_, i) => ({
        name: `field${i}`,
        type: 'string' as const,
      }))

      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'complex', fields}],
      })

      expect(result.blockObjects[0]!.fields).toHaveLength(10)
    })

    test('field title defaults to startCase of field name', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [
          {name: 'test', fields: [{name: 'myFieldName', type: 'string'}]},
        ],
      })

      expect(result.blockObjects[0]!.fields[0]!.type.title).toBe(
        'My Field Name',
      )
    })

    test('explicit field title is preserved', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [
          {
            name: 'test',
            fields: [{name: 'myField', type: 'string', title: 'Custom Title'}],
          },
        ],
      })

      expect(result.blockObjects[0]!.fields[0]!.type.title).toBe('Custom Title')
    })
  })

  // --- Sanity schema path (portableText array type) ---

  describe('Sanity schema path', () => {
    test('portableText array type is created correctly', () => {
      const result = compileSchemaDefinitionToPortableTextMemberSchemaTypes({
        blockObjects: [{name: 'divider'}],
        inlineObjects: [{name: 'emoji'}],
        decorators: [{name: 'strong'}],
        styles: [{name: 'normal'}],
        lists: [{name: 'bullet'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      })

      // The portableText field should be an array type
      expect(result.portableText.jsonType).toBe('array')

      // Block type should be present
      expect(result.block.name).toBe('block')

      // Span type should be present
      expect(result.span.name).toBe('span')
    })
  })
})
