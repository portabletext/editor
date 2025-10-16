import {
  blockquote,
  bold,
  code,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  italic,
  link,
  normal,
  strikeThrough,
  underline,
} from '@portabletext/keyboard-shortcuts'
import {
  useToolbarSchema,
  type ExtendAnnotationSchemaType,
  type ExtendBlockObjectSchemaType,
  type ExtendDecoratorSchemaType,
  type ExtendInlineObjectSchemaType,
  type ExtendListSchemaType,
  type ExtendStyleSchemaType,
} from '@portabletext/toolbar'
import {
  ActivityIcon,
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MessageSquareTextIcon,
  PilcrowIcon,
  SeparatorHorizontalIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TextQuoteIcon,
  UnderlineIcon,
} from 'lucide-react'

const extendDecorator: ExtendDecoratorSchemaType = (decorator) => {
  if (decorator.name === 'strong') {
    return {
      ...decorator,
      icon: BoldIcon,
      shortcut: bold,
    }
  }

  if (decorator.name === 'em') {
    return {
      ...decorator,
      icon: ItalicIcon,
      shortcut: italic,
    }
  }

  if (decorator.name === 'code') {
    return {
      ...decorator,
      icon: CodeIcon,
      shortcut: code,
    }
  }

  if (decorator.name === 'underline') {
    return {
      ...decorator,
      icon: UnderlineIcon,
      shortcut: underline,
    }
  }

  if (decorator.name === 'strike-through') {
    return {
      ...decorator,
      icon: StrikethroughIcon,
      shortcut: strikeThrough,
    }
  }

  if (decorator.name === 'subscript') {
    return {
      ...decorator,
      icon: SubscriptIcon,
      mutuallyExclusive: ['superscript'],
    }
  }

  if (decorator.name === 'superscript') {
    return {
      ...decorator,
      icon: SuperscriptIcon,
      mutuallyExclusive: ['subscript'],
    }
  }

  return decorator
}

const extendAnnotation: ExtendAnnotationSchemaType = (annotation) => {
  if (annotation.name === 'link') {
    return {
      ...annotation,
      icon: LinkIcon,
      defaultValues: {
        href: 'https://example.com',
      },
      shortcut: link,
    }
  }

  if (annotation.name === 'comment') {
    return {
      ...annotation,
      icon: MessageSquareTextIcon,
      defaultValues: {
        text: 'Consider rewriting this',
      },
      mutuallyExclusive: [],
    }
  }

  return annotation
}

const extendStyle: ExtendStyleSchemaType = (style) => {
  if (style.name === 'normal') {
    return {
      ...style,
      icon: PilcrowIcon,
      shortcut: normal,
    }
  }
  if (style.name === 'h1') {
    return {
      ...style,
      icon: Heading1Icon,
      shortcut: h1,
    }
  }

  if (style.name === 'h2') {
    return {
      ...style,
      icon: Heading2Icon,
      shortcut: h2,
    }
  }

  if (style.name === 'h3') {
    return {
      ...style,
      icon: Heading3Icon,
      shortcut: h3,
    }
  }

  if (style.name === 'h4') {
    return {
      ...style,
      icon: Heading4Icon,
      shortcut: h4,
    }
  }

  if (style.name === 'h5') {
    return {
      ...style,
      icon: Heading5Icon,
      shortcut: h5,
    }
  }

  if (style.name === 'h6') {
    return {
      ...style,
      icon: Heading6Icon,
      shortcut: h6,
    }
  }

  if (style.name === 'blockquote') {
    return {
      ...style,
      icon: TextQuoteIcon,
      shortcut: blockquote,
    }
  }

  return style
}

const extendList: ExtendListSchemaType = (list) => {
  if (list.name === 'bullet') {
    return {
      ...list,
      icon: ListIcon,
    }
  }

  if (list.name === 'number') {
    return {
      ...list,
      icon: ListOrderedIcon,
    }
  }

  return list
}

const extendBlockObject: ExtendBlockObjectSchemaType = (blockObject) => {
  if (blockObject.name === 'break') {
    return {
      ...blockObject,
      icon: SeparatorHorizontalIcon,
    }
  }

  if (blockObject.name === 'image') {
    return {
      ...blockObject,
      icon: ImageIcon,
      defaultValues: {
        src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=',
        alt: 'Portable Text logo',
      },
    }
  }

  return blockObject
}

const extendInlineObject: ExtendInlineObjectSchemaType = (inlineObject) => {
  if (inlineObject.name === 'stock-ticker') {
    return {
      ...inlineObject,
      icon: ActivityIcon,
      defaultValues: {
        symbol: 'NVDA',
      },
    }
  }

  if (inlineObject.name === 'image') {
    return {
      ...inlineObject,
      icon: ImageIcon,
      defaultValues: {
        src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=',
        alt: 'Portable Text logo',
      },
    }
  }

  return inlineObject
}

export function usePlaygroundToolbarSchema() {
  return useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    extendStyle,
    extendList,
    extendBlockObject,
    extendInlineObject,
  })
}
