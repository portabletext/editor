# Markdown to Portable Text: A Complete Guide

Converting markdown to Portable Text is a **powerful** way to bridge the gap between _simple text formatting_ and **_structured content_**.

## Why Portable Text?

Portable Text is a **specification** for _rich text_ that is:

- Platform **agnostic**
- **Structured** and _queryable_
- Designed for **_modern content workflows_**

Visit [https://portabletext.org](https://portabletext.org) for more information, or check out the [official documentation](https://github.com/portabletext/portabletext "Portable Text Spec").

---

## Supported Features

### Text Formatting

You can use **bold text**, _italic text_, `inline code`, and even ~~strikethrough~~ text. The parser handles **_nested formatting_** gracefully, including **_bold and italic_** combined.

Here’s some `code with **bold inside**` and **text with `code inside`** to test edge cases.

### Links and Images

Reference-style links work too! Check out this [example link](https://portabletext.org "Portable Text Homepage") that uses references defined elsewhere.

![A beautiful diagram](https://example.com/diagram.png "Markdown to PT Flow")

Here’s an inline image in text: ![icon](https://example.com/icon.png) followed by more text.

### Code Blocks

Fenced code blocks with syntax highlighting:

```javascript
function markdownToPortableText(markdown) {
  const tokens = parseMarkdown(markdown)
  return transformToPortableText(tokens)
}
```

Indented code blocks also work:

```
const simple = "code block";
console.log(simple);
```

### Blockquotes

> Markdown is a lightweight markup language for creating formatted text.
>
> It was created by John Gruber in 2004.

Nested blockquotes are supported:

> This is the outer quote
>
> And this is nested deeper
>
> With multiple paragraphs

### Lists

#### Unordered Lists

- **Bold item** in a list
- _Italic item_ with [a link](https://example.com)
- Item with `inline code`
   - Nested item one
   - Nested item two
      - Even deeper nesting
- Back to top level

#### Ordered Lists

1. First step: Parse the markdown
2. Second step: Generate tokens
3. Third step: Transform to Portable Text
   1. Map block types
   2. Handle inline formatting
   3. Preserve structure

#### Mixed Lists

1. Ordered parent
   - Unordered child
   - Another unordered
      1. Back to ordered
      2. Still ordered
2. Continue ordered parent

### Tables

Here’s a comparison of different content formats:

| Format | Structured | Portable | Query-able |
| --- | --- | --- | --- |
| **Markdown** | ✗ | ✓ | ✗ |
| **HTML** | ~ | ✗ | ✗ |
| **Portable Text** | ✓ | ✓ | ✓ |
| Plain Text | ✗ | ✓ | ✗ |

Feature support matrix:

| Feature | Basic | Advanced | Notes |
| --- | --- | --- | --- |
| Paragraphs | ✓ | ✓ | Full support |
| **Bold** | ✓ | ✓ | Including nested |
| _Italic_ | ✓ | ✓ | Works everywhere |
| `Code` | ✓ | ✓ | Inline and blocks |
| Links | ✓ | ✓ | All types supported |
| Images | ~ | ✓ | Block and inline |

### Horizontal Rules

You can separate sections with horizontal rules:

---

They create visual breaks in the content.

---

### All Heading Levels

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## Advanced Examples

### Overlapping Formatting

This paragraph contains **bold with _italic inside_** and _italic with **bold inside**_ to test proper nesting.

You can also have **bold with `code`** and _italic with `code`_ and even `code with **bold** and _italic_` (though the formatting inside code should be preserved as-is).

### Links with Formatting

Here’s a [**bold link**](https://example.com) and an [_italic link_](https://example.com) and even a [`code link`](https://example.com).

### Complex List Items

- Item with **bold**, _italic_, and `code`
- Item with a [link to **bold** content](https://example.com "Link Title")
- Item with an inline image ![small icon](https://example.com/icon.png) in the middle
   - Nested **bold item** with _italic_ and `code`
   - Another nested item

### Line Breaks

This is a line with a hard break
that continues on the next line but stays in the same paragraph.

Another paragraph with a break
and more content.

### Autolinks

Check out these autolinks: [https://example.com](https://example.com) and [mailto:hello@example.com](mailto:hello@example.com) for quick linking.

### HTML Passthrough

<div class="custom-block">
  <p>This is raw HTML that gets preserved</p>
</div>

Inline HTML like <span class="highlight">highlighted text</span> can be handled too.

### Reference Links

This is [reference link one](https://portabletext.org "Portable Text Homepage") and this is [reference link two](https://github.com/portabletext/editor "Portable Text Editor").

You can also use [implicit references](https://example.com "Implicit Reference Example") by just using the text as the reference.

## Implementation Notes

The transformation process involves several key steps:

1. **Lexical Analysis**: Parse markdown into tokens
2. **Syntax Tree Building**: Construct an AST from tokens
3. **Transformation**: Map markdown AST to Portable Text structure
4. **Validation**: Ensure output conforms to schema

### Edge Cases

#### Empty Blocks

Sometimes you have empty paragraphs:

Or consecutive horizontal rules:

---

---

#### Special Characters

Text with special characters like `&amp;`, `&lt;`, and `&gt;` should be handled correctly.

#### URLs in Text

Raw URLs like [https://example.com](https://example.com) (without angle brackets) may or may not become links depending on the parser configuration.

## Conclusion

This document demonstrates the **comprehensive** support for _markdown features_ in the `markdown-to-portable-text` converter. With proper handling of:

- All basic formatting
- Complex nesting
- Various link types
- Images (block and inline)
- Code blocks
- Lists of all types
- Tables
- And much more!

The result is **_robust, reliable_** content transformation that preserves both structure and semantics.

---

**Happy converting!** 🎉

_Last updated: 2025_
