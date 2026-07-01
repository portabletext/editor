import {defineSchema} from '@portabletext/editor'
import {z} from 'zod'

export const playgroundSchemaDefinition = defineSchema({
  block: {
    fields: [{name: 'checked', title: 'Checked', type: 'boolean'}],
  },
  decorators: [
    {
      title: 'Strong',
      name: 'strong',
    },
    {
      title: 'Emphasis',
      name: 'em',
    },
    {
      title: 'Code',
      name: 'code',
    },
    {
      title: 'Underline',
      name: 'underline',
    },
    {
      title: 'Strike',
      name: 'strike-through',
    },
    {
      title: 'Subscript',
      name: 'subscript',
    },
    {
      title: 'Superscript',
      name: 'superscript',
    },
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
    {
      title: 'Comment',
      name: 'comment',
      fields: [{name: 'text', title: 'Text', type: 'string'}],
    },
  ],
  lists: [
    {
      title: 'Bulleted list',
      name: 'bullet',
    },
    {
      title: 'Numbered list',
      name: 'number',
    },
    {
      title: 'Task list',
      name: 'task',
    },
  ],
  styles: [
    {
      title: 'Normal',
      name: 'normal',
    },
    {
      title: 'Heading 1',
      name: 'h1',
    },
    {
      title: 'Heading 2',
      name: 'h2',
    },
    {
      title: 'Heading 3',
      name: 'h3',
    },
    {
      title: 'Heading 4',
      name: 'h4',
    },
    {
      title: 'Heading 5',
      name: 'h5',
    },
    {
      title: 'Heading 6',
      name: 'h6',
    },
    {
      title: 'Quote',
      name: 'blockquote',
    },
  ],
  blockObjects: [
    {
      title: 'Break',
      name: 'break',
    },
    {
      title: 'Image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
    // ARCHETYPE 1 - locked-down: nothing in scope.
    // Tests: every operation correctly skips when sub-schema declares
    // nothing. Toolbar shows everything dimmed inside a code-block.
    {
      title: 'Code block',
      name: 'code-block',
      fields: [
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
    // ARCHETYPE 2 - full inheritance: mirrors root exactly.
    // Tests: behaves identically to root. Allows nested heterogeneous
    // containers (callout + code-block + image) - exercises traversal
    // across nested containers with DIFFERENT sub-schemas.
    {
      title: 'Fact box',
      name: 'fact-box',
      fields: [
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {title: 'Strong', name: 'strong'},
                {title: 'Emphasis', name: 'em'},
                {title: 'Code', name: 'code'},
                {title: 'Underline', name: 'underline'},
                {title: 'Strike', name: 'strike-through'},
                {title: 'Subscript', name: 'subscript'},
                {title: 'Superscript', name: 'superscript'},
              ],
              annotations: [
                {
                  title: 'Link',
                  name: 'link',
                  fields: [{name: 'href', title: 'HREF', type: 'string'}],
                },
                {
                  title: 'Comment',
                  name: 'comment',
                  fields: [{name: 'text', title: 'Text', type: 'string'}],
                },
              ],
              styles: [
                {title: 'Normal', name: 'normal'},
                {title: 'Heading 1', name: 'h1'},
                {title: 'Heading 2', name: 'h2'},
                {title: 'Heading 3', name: 'h3'},
                {title: 'Heading 4', name: 'h4'},
                {title: 'Heading 5', name: 'h5'},
                {title: 'Heading 6', name: 'h6'},
                {title: 'Quote', name: 'blockquote'},
              ],
              lists: [
                {title: 'Bulleted list', name: 'bullet'},
                {title: 'Numbered list', name: 'number'},
                {title: 'Task list', name: 'task'},
              ],
              inlineObjects: [
                {
                  title: 'Stock ticker',
                  name: 'stock-ticker',
                  fields: [{name: 'symbol', title: 'Symbol', type: 'string'}],
                },
                {
                  title: 'Inline image',
                  name: 'image',
                  fields: [
                    {name: 'src', title: 'Src', type: 'string'},
                    {name: 'alt', title: 'Alt text', type: 'string'},
                  ],
                },
                {
                  title: 'Mention',
                  name: 'mention',
                  fields: [
                    {name: 'userId', title: 'User ID', type: 'string'},
                    {name: 'name', title: 'Name', type: 'string'},
                    {
                      name: 'username',
                      title: 'Username',
                      type: 'string',
                    },
                  ],
                },
              ],
            },
            {
              type: 'object',
              name: 'image',
              fields: [
                {name: 'src', title: 'Src', type: 'string'},
                {name: 'alt', title: 'Alt text', type: 'string'},
              ],
            },
            {
              type: 'object',
              name: 'callout',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [
                        {title: 'Strong', name: 'strong'},
                        {title: 'Code', name: 'code'},
                      ],
                      styles: [
                        {title: 'Normal', name: 'normal'},
                        {title: 'Heading 1', name: 'h1'},
                        {title: 'Quote', name: 'blockquote'},
                      ],
                      annotations: [
                        {
                          title: 'Comment',
                          name: 'comment',
                          fields: [
                            {name: 'text', title: 'Text', type: 'string'},
                          ],
                        },
                      ],
                      lists: [{title: 'Bulleted list', name: 'bullet'}],
                      inlineObjects: [
                        {
                          title: 'Mention',
                          name: 'mention',
                          fields: [
                            {name: 'userId', title: 'User ID', type: 'string'},
                            {name: 'name', title: 'Name', type: 'string'},
                            {
                              name: 'username',
                              title: 'Username',
                              type: 'string',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'object',
                      name: 'image',
                      fields: [
                        {name: 'src', title: 'Src', type: 'string'},
                        {name: 'alt', title: 'Alt text', type: 'string'},
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'object',
              name: 'code-block',
              fields: [
                {
                  name: 'lines',
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
          ],
        },
      ],
    },
    // ARCHETYPE 3 - selective subsets: ONE-OF in every dimension.
    // Decorators: only strong. Annotations: only comment.
    // Styles: normal + h1 + h2 + h3 + blockquote.
    // Lists: bullet + number (narrowing still exercised by the nested
    // callouts below, which stay bullet-only / empty).
    // Inline objects: only mention.
    // Allows image + nested callout (recursive same-type nesting).
    {
      title: 'Callout',
      name: 'callout',
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
                {title: 'Strong', name: 'strong'},
                {title: 'Code', name: 'code'},
              ],
              styles: [
                {title: 'Normal', name: 'normal'},
                {title: 'Heading 1', name: 'h1'},
                {title: 'Heading 2', name: 'h2'},
                {title: 'Heading 3', name: 'h3'},
                {title: 'Quote', name: 'blockquote'},
              ],
              annotations: [
                {
                  title: 'Comment',
                  name: 'comment',
                  fields: [{name: 'text', title: 'Text', type: 'string'}],
                },
              ],
              lists: [
                {title: 'Bulleted list', name: 'bullet'},
                {title: 'Numbered list', name: 'number'},
              ],
              inlineObjects: [
                {
                  title: 'Mention',
                  name: 'mention',
                  fields: [
                    {name: 'userId', title: 'User ID', type: 'string'},
                    {name: 'name', title: 'Name', type: 'string'},
                    {
                      name: 'username',
                      title: 'Username',
                      type: 'string',
                    },
                  ],
                },
              ],
            },
            {
              type: 'object',
              name: 'image',
              fields: [
                {name: 'src', title: 'Src', type: 'string'},
                {name: 'alt', title: 'Alt text', type: 'string'},
              ],
            },
            {
              type: 'object',
              name: 'callout',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [
                        {title: 'Strong', name: 'strong'},
                        {title: 'Code', name: 'code'},
                      ],
                      styles: [{title: 'Normal', name: 'normal'}],
                      annotations: [],
                      lists: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    // ARCHETYPE 4 - deep structural nesting + heterogeneous depth.
    // table → row → cell. cell.content allows strong + em decorators,
    // link annotation, normal style, bullet + number lists, no inline objects.
    // PLUS cell.content allows nested callout (different sub-schema
    // than cell). Tests deep traversal AND voting across multiple
    // sub-schemas at different depths.
    {
      title: 'Table',
      name: 'table',
      fields: [
        {
          name: 'headerRows',
          title: 'Header rows',
          type: 'number',
        },
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
                          name: 'value',
                          title: 'Content',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {title: 'Strong', name: 'strong'},
                                {title: 'Emphasis', name: 'em'},
                                {title: 'Code', name: 'code'},
                              ],
                              styles: [{title: 'Normal', name: 'normal'}],
                              annotations: [
                                {
                                  title: 'Link',
                                  name: 'link',
                                  fields: [
                                    {
                                      name: 'href',
                                      title: 'HREF',
                                      type: 'string',
                                    },
                                  ],
                                },
                              ],
                              lists: [
                                {title: 'Bulleted list', name: 'bullet'},
                                {title: 'Numbered list', name: 'number'},
                              ],
                            },
                            {
                              type: 'object',
                              name: 'callout',
                              fields: [
                                {
                                  name: 'content',
                                  type: 'array',
                                  of: [
                                    {
                                      type: 'block',
                                      decorators: [
                                        {title: 'Strong', name: 'strong'},
                                        {title: 'Code', name: 'code'},
                                      ],
                                      styles: [
                                        {title: 'Normal', name: 'normal'},
                                        {title: 'Quote', name: 'blockquote'},
                                      ],
                                      annotations: [
                                        {
                                          title: 'Comment',
                                          name: 'comment',
                                          fields: [
                                            {
                                              name: 'text',
                                              title: 'Text',
                                              type: 'string',
                                            },
                                          ],
                                        },
                                      ],
                                      lists: [
                                        {
                                          title: 'Bulleted list',
                                          name: 'bullet',
                                        },
                                      ],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              type: 'object',
                              name: 'image',
                              fields: [
                                {name: 'src', title: 'Src', type: 'string'},
                                {
                                  name: 'alt',
                                  title: 'Alt text',
                                  type: 'string',
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
    },
  ],
  inlineObjects: [
    {
      title: 'Stock ticker',
      name: 'stock-ticker',
      fields: [{name: 'symbol', title: 'Symbol', type: 'string'}],
    },
    {
      title: 'Inline image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
    {
      title: 'Mention',
      name: 'mention',
      fields: [
        {name: 'userId', title: 'User ID', type: 'string'},
        {name: 'name', title: 'Name', type: 'string'},
        {name: 'username', title: 'Username', type: 'string'},
      ],
    },
  ],
})

export const CommentAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal('comment'),
  }),
  value: z.object({
    text: z.string(),
  }),
})

export const LinkAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal('link'),
  }),
  value: z.object({
    href: z.string(),
  }),
})
