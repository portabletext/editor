import {defineSchema} from '@portabletext/editor'

// Mirrors @portabletext/markdown's defaults so values produced by
// markdownToPortableText pass the editor's schema validation. Lists are
// declared as structural `list` block-objects (not flat `lists` items) so
// list items can hold rich nested content like code blocks and callouts.
export const schemaDefinition = defineSchema({
  block: {
    fields: [{name: 'checked', type: 'boolean'}],
  },
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
  ],
  decorators: [
    {name: 'strong'},
    {name: 'em'},
    {name: 'code'},
    {name: 'strike-through'},
  ],
  annotations: [
    {
      name: 'link',
      fields: [
        {name: 'href', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
  ],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {name: 'tone', type: 'string'},
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {name: 'strong'},
                {name: 'em'},
                {name: 'code'},
                {name: 'strike-through'},
              ],
              styles: [{name: 'normal'}],
              annotations: [
                {
                  name: 'link',
                  fields: [
                    {name: 'href', type: 'string'},
                    {name: 'title', type: 'string'},
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
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {name: 'strong'},
                {name: 'em'},
                {name: 'code'},
                {name: 'strike-through'},
              ],
              styles: [{name: 'normal'}],
              annotations: [
                {
                  name: 'link',
                  fields: [
                    {name: 'href', type: 'string'},
                    {name: 'title', type: 'string'},
                  ],
                },
              ],
            },
            {
              type: 'code-block',
              fields: [
                {name: 'language', type: 'string'},
                {
                  name: 'lines',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [],
                      decorators: [],
                      annotations: [],
                      inlineObjects: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'code-block',
      fields: [
        {name: 'language', type: 'string'},
        {
          name: 'lines',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [],
              decorators: [],
              annotations: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
    {name: 'horizontal-rule'},
    {
      name: 'html',
      fields: [
        {
          name: 'code',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [],
              decorators: [],
              annotations: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
    {
      name: 'image',
      fields: [
        {name: 'src', type: 'string'},
        {name: 'alt', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
    {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {name: 'checked', type: 'boolean'},
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      decorators: [
                        {name: 'strong'},
                        {name: 'em'},
                        {name: 'code'},
                        {name: 'strike-through'},
                      ],
                      styles: [{name: 'normal'}],
                      annotations: [
                        {
                          name: 'link',
                          fields: [
                            {name: 'href', type: 'string'},
                            {name: 'title', type: 'string'},
                          ],
                        },
                      ],
                    },
                    {
                      type: 'code-block',
                      fields: [
                        {name: 'language', type: 'string'},
                        {
                          name: 'lines',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              styles: [],
                              decorators: [],
                              annotations: [],
                              inlineObjects: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'callout',
                      fields: [
                        {name: 'tone', type: 'string'},
                        {
                          name: 'content',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {name: 'strong'},
                                {name: 'em'},
                                {name: 'code'},
                                {name: 'strike-through'},
                              ],
                              styles: [{name: 'normal'}],
                              annotations: [
                                {
                                  name: 'link',
                                  fields: [
                                    {name: 'href', type: 'string'},
                                    {name: 'title', type: 'string'},
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {type: 'list'},
                    {type: 'image'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'value',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {name: 'strong'},
                                {name: 'em'},
                                {name: 'code'},
                                {name: 'strike-through'},
                              ],
                              styles: [{name: 'normal'}],
                              annotations: [
                                {
                                  name: 'link',
                                  fields: [
                                    {name: 'href', type: 'string'},
                                    {name: 'title', type: 'string'},
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
    },
  ],
  inlineObjects: [
    {
      name: 'image',
      fields: [
        {name: 'src', type: 'string'},
        {name: 'alt', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
  ],
})
