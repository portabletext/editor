import {defineSchema} from '@portabletext/editor'

/**
 * Pilcrow schema. Covers the full markdown construct set.
 *
 * Container types (code-block, callout, table, list, list-item) and
 * leaf types (image, horizontal-rule) are declared here; their
 * runtime registration and rendering live in the per-construct
 * plugin files under `./plugins/`.
 *
 * The shape mirrors how a Sanity schema declares these types - this
 * file is the catalog, the plugins are the wiring.
 */
export const schemaDefinition = defineSchema({
  decorators: [
    {name: 'strong', title: 'Bold'},
    {name: 'em', title: 'Italic'},
    {name: 'code', title: 'Code'},
    {name: 'strike-through', title: 'Strikethrough'},
  ],
  styles: [
    {name: 'normal', title: 'Paragraph'},
    {name: 'h1', title: 'Heading 1'},
    {name: 'h2', title: 'Heading 2'},
    {name: 'h3', title: 'Heading 3'},
    {name: 'h4', title: 'Heading 4'},
    {name: 'h5', title: 'Heading 5'},
    {name: 'h6', title: 'Heading 6'},
  ],
  annotations: [
    {
      name: 'link',
      title: 'Link',
      fields: [{name: 'href', title: 'URL', type: 'string'}],
    },
  ],
  lists: [
    {name: 'bullet', title: 'Bulleted list'},
    {name: 'number', title: 'Numbered list'},
    {name: 'task', title: 'Task list'},
  ],
  blockObjects: [
    {
      name: 'list',
      title: 'List',
      fields: [
        {name: 'kind', title: 'Kind', type: 'string'},
        {
          name: 'items',
          title: 'Items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {name: 'checked', title: 'Checked', type: 'boolean'},
                {
                  name: 'content',
                  title: 'Content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [
                        {name: 'strong', title: 'Bold'},
                        {name: 'em', title: 'Italic'},
                        {name: 'code', title: 'Code'},
                        {name: 'strike-through', title: 'Strikethrough'},
                      ],
                      annotations: [
                        {
                          name: 'link',
                          title: 'Link',
                          fields: [
                            {name: 'href', title: 'URL', type: 'string'},
                          ],
                        },
                      ],
                      styles: [
                        {name: 'normal', title: 'Paragraph'},
                        {name: 'h1', title: 'Heading 1'},
                        {name: 'h2', title: 'Heading 2'},
                        {name: 'h3', title: 'Heading 3'},
                        {name: 'h4', title: 'Heading 4'},
                        {name: 'h5', title: 'Heading 5'},
                        {name: 'h6', title: 'Heading 6'},
                      ],
                      lists: [],
                      inlineObjects: [],
                    },
                    {type: 'list'},
                    {type: 'image'},
                    {type: 'code-block'},
                    {type: 'blockquote'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'blockquote',
      title: 'Blockquote',
      fields: [
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {name: 'strong', title: 'Bold'},
                {name: 'em', title: 'Italic'},
                {name: 'code', title: 'Code'},
                {name: 'strike-through', title: 'Strikethrough'},
              ],
              annotations: [
                {
                  name: 'link',
                  title: 'Link',
                  fields: [{name: 'href', title: 'URL', type: 'string'}],
                },
              ],
              styles: [
                {name: 'normal', title: 'Paragraph'},
                {name: 'h1', title: 'Heading 1'},
                {name: 'h2', title: 'Heading 2'},
                {name: 'h3', title: 'Heading 3'},
                {name: 'h4', title: 'Heading 4'},
                {name: 'h5', title: 'Heading 5'},
                {name: 'h6', title: 'Heading 6'},
              ],
              lists: [],
              inlineObjects: [],
            },
            {type: 'blockquote'},
          ],
        },
      ],
    },
    {
      name: 'horizontal-rule',
      title: 'Divider',
    },
    {
      name: 'image',
      title: 'Image',
      fields: [
        {name: 'src', title: 'Source', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
        {name: 'caption', title: 'Caption', type: 'string'},
      ],
    },
    {
      name: 'code-block',
      title: 'Code block',
      fields: [
        {name: 'language', title: 'Language', type: 'string'},
        {
          name: 'lines',
          title: 'Lines',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [],
              decorators: [],
              annotations: [],
              lists: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
    {
      name: 'callout',
      title: 'Callout',
      fields: [
        {name: 'tone', title: 'Tone', type: 'string'},
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {name: 'strong', title: 'Bold'},
                {name: 'em', title: 'Italic'},
                {name: 'code', title: 'Code'},
                {name: 'strike-through', title: 'Strikethrough'},
              ],
              annotations: [
                {
                  name: 'link',
                  title: 'Link',
                  fields: [{name: 'href', title: 'URL', type: 'string'}],
                },
              ],
              styles: [{name: 'normal', title: 'Paragraph'}],
              lists: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
    {
      name: 'table',
      title: 'Table',
      fields: [
        {name: 'headerRows', title: 'Header rows', type: 'number'},
        {
          name: 'rows',
          title: 'Rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  title: 'Cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          title: 'Content',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {name: 'strong', title: 'Bold'},
                                {name: 'em', title: 'Italic'},
                                {name: 'code', title: 'Code'},
                                {
                                  name: 'strike-through',
                                  title: 'Strikethrough',
                                },
                              ],
                              annotations: [
                                {
                                  name: 'link',
                                  title: 'Link',
                                  fields: [
                                    {
                                      name: 'href',
                                      title: 'URL',
                                      type: 'string',
                                    },
                                  ],
                                },
                              ],
                              styles: [{name: 'normal', title: 'Paragraph'}],
                              lists: [],
                              inlineObjects: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  inlineObjects: [],
})
