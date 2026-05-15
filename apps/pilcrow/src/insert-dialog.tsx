import {useEditor, type PortableTextBlock} from '@portabletext/editor'
import {useEffect, useRef, useState} from 'react'

/**
 * Modal dialog for inserting block objects with fields. Reads field
 * definitions from a per-type config and renders a form. Used by the
 * toolbar's block-insert buttons instead of \`window.prompt\`.
 */
type FieldDef =
  | {
      type: 'text'
      name: string
      label: string
      defaultValue: string
      placeholder?: string
    }
  | {
      type: 'select'
      name: string
      label: string
      defaultValue: string
      options: ReadonlyArray<{value: string; label: string}>
    }
  | {
      type: 'number'
      name: string
      label: string
      defaultValue: number
      min?: number
      max?: number
    }
  | {
      type: 'checkbox'
      name: string
      label: string
      defaultValue: boolean
    }

export type InsertDialogConfig = {
  blockType: string
  title: string
  fields: ReadonlyArray<FieldDef>
  /**
   * Override how the inserted block is constructed from the field
   * values. Defaults to spreading values into the block alongside
   * \`_type\`. Use for cases like the table dialog where the form
   * shape doesn't match the block shape directly.
   */
  buildBlock?: (
    values: Record<string, unknown>,
    keyGen: () => string,
  ) => Record<string, unknown>
}

export const insertDialogConfigs: Record<string, InsertDialogConfig> = {
  'image': {
    blockType: 'image',
    title: 'Insert image',
    fields: [
      {
        type: 'text',
        name: 'src',
        label: 'Source URL',
        defaultValue: '',
        placeholder: 'https://...',
      },
      {
        type: 'text',
        name: 'alt',
        label: 'Alt text',
        defaultValue: '',
        placeholder: 'Describe the image',
      },
      {
        type: 'text',
        name: 'caption',
        label: 'Caption',
        defaultValue: '',
        placeholder: 'Optional caption',
      },
    ],
  },
  'code-block': {
    blockType: 'code-block',
    title: 'Insert code block',
    buildBlock: (values, keyGen) => ({
      language: values.language ?? 'ts',
      lines: [
        {
          _type: 'block',
          _key: keyGen(),
          style: 'normal',
          children: [{_type: 'span', _key: keyGen(), text: '', marks: []}],
          markDefs: [],
        },
      ],
    }),
    fields: [
      {
        type: 'select',
        name: 'language',
        label: 'Language',
        defaultValue: 'ts',
        options: [
          {value: 'ts', label: 'TypeScript'},
          {value: 'tsx', label: 'TSX'},
          {value: 'js', label: 'JavaScript'},
          {value: 'jsx', label: 'JSX'},
          {value: 'json', label: 'JSON'},
          {value: 'html', label: 'HTML'},
          {value: 'css', label: 'CSS'},
          {value: 'md', label: 'Markdown'},
          {value: 'bash', label: 'Shell'},
          {value: 'python', label: 'Python'},
          {value: 'rust', label: 'Rust'},
          {value: 'go', label: 'Go'},
          {value: 'sql', label: 'SQL'},
          {value: 'text', label: 'Plain text'},
        ],
      },
    ],
  },
  'blockquote': {
    blockType: 'blockquote',
    title: 'Insert blockquote',
    buildBlock: (_values, keyGen) => ({
      content: [
        {
          _type: 'block',
          _key: keyGen(),
          style: 'normal',
          children: [{_type: 'span', _key: keyGen(), text: '', marks: []}],
          markDefs: [],
        },
      ],
    }),
    fields: [],
  },
  'callout': {
    blockType: 'callout',
    title: 'Insert callout',
    buildBlock: (values, keyGen) => ({
      tone: values.tone ?? 'note',
      content: [
        {
          _type: 'block',
          _key: keyGen(),
          style: 'normal',
          children: [{_type: 'span', _key: keyGen(), text: '', marks: []}],
          markDefs: [],
        },
      ],
    }),
    fields: [
      {
        type: 'select',
        name: 'tone',
        label: 'Tone',
        defaultValue: 'note',
        options: [
          {value: 'note', label: 'Note'},
          {value: 'tip', label: 'Tip'},
          {value: 'warning', label: 'Warning'},
          {value: 'caution', label: 'Caution'},
        ],
      },
    ],
  },
  'table': {
    blockType: 'table',
    title: 'Insert table',
    buildBlock: (values, keyGen) =>
      buildTableBlock({
        rows: Math.max(1, Math.min(20, Number(values.rows) || 2)),
        columns: Math.max(1, Math.min(10, Number(values.columns) || 2)),
        headerRows: Math.max(0, Math.min(2, Number(values.headerRows) || 0)),
        keyGen,
      }),
    fields: [
      {
        type: 'number',
        name: 'rows',
        label: 'Rows',
        defaultValue: 2,
        min: 1,
        max: 20,
      },
      {
        type: 'number',
        name: 'columns',
        label: 'Columns',
        defaultValue: 2,
        min: 1,
        max: 10,
      },
      {
        type: 'number',
        name: 'headerRows',
        label: 'Header rows',
        defaultValue: 0,
        min: 0,
        max: 2,
      },
    ],
  },
}

/**
 * Build a fresh table block with the requested dimensions. Each cell
 * starts with one empty paragraph so the caret has a valid landing
 * spot when the user moves into the table. Header rows are advisory
 * - the renderer reads them off the table's \`headerRows\` field.
 */
export function buildTableBlock(input: {
  rows: number
  columns: number
  headerRows: number
  keyGen: () => string
}): Partial<PortableTextBlock> {
  const {rows, columns, headerRows, keyGen} = input
  const rowList = Array.from({length: rows}, () => ({
    _type: 'row',
    _key: keyGen(),
    cells: Array.from({length: columns}, () => ({
      _type: 'cell',
      _key: keyGen(),
      content: [
        {
          _type: 'block',
          _key: keyGen(),
          style: 'normal',
          children: [{_type: 'span', _key: keyGen(), text: '', marks: []}],
          markDefs: [],
        },
      ],
    })),
  }))
  return {headerRows, rows: rowList} as Partial<PortableTextBlock>
}

export function InsertDialog(props: {
  config: InsertDialogConfig
  onClose: () => void
}) {
  const editor = useEditor()
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      props.config.fields.map((field) => [field.name, field.defaultValue]),
    ),
  )
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(
    null,
  )
  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const keyGen = editor.getSnapshot().context.keyGenerator
    const block = props.config.buildBlock
      ? {
          _type: props.config.blockType,
          ...props.config.buildBlock(values, keyGen),
        }
      : {_type: props.config.blockType, ...values}
    editor.send({
      type: 'insert.block',
      block,
      placement: 'auto',
      select: 'start',
    })
    props.onClose()
  }

  return (
    <div className="pc-dialog-backdrop" role="presentation">
      <form
        className="pc-dialog"
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            props.onClose()
          }
        }}
      >
        <h2 className="pc-dialog-title">{props.config.title}</h2>
        <div className="pc-dialog-fields">
          {props.config.fields.map((field, index) => {
            const setValue = (value: unknown) =>
              setValues((current) => ({...current, [field.name]: value}))
            const id = `pc-dialog-${field.name}`
            if (field.type === 'text') {
              return (
                <label
                  key={field.name}
                  className="pc-dialog-field"
                  htmlFor={id}
                >
                  <span className="pc-dialog-field-label">{field.label}</span>
                  <input
                    ref={
                      index === 0
                        ? (firstFieldRef as React.RefObject<HTMLInputElement>)
                        : undefined
                    }
                    id={id}
                    className="pc-dialog-input"
                    type="text"
                    value={(values[field.name] as string) ?? ''}
                    placeholder={field.placeholder}
                    onChange={(event) => setValue(event.target.value)}
                  />
                </label>
              )
            }
            if (field.type === 'number') {
              return (
                <label
                  key={field.name}
                  className="pc-dialog-field"
                  htmlFor={id}
                >
                  <span className="pc-dialog-field-label">{field.label}</span>
                  <input
                    ref={
                      index === 0
                        ? (firstFieldRef as React.RefObject<HTMLInputElement>)
                        : undefined
                    }
                    id={id}
                    className="pc-dialog-input"
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={(values[field.name] as number) ?? field.defaultValue}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10)
                      if (Number.isFinite(parsed)) {
                        setValue(parsed)
                      }
                    }}
                  />
                </label>
              )
            }
            if (field.type === 'checkbox') {
              return (
                <label
                  key={field.name}
                  className="pc-dialog-field pc-dialog-field-inline"
                  htmlFor={id}
                >
                  <input
                    ref={
                      index === 0
                        ? (firstFieldRef as React.RefObject<HTMLInputElement>)
                        : undefined
                    }
                    id={id}
                    className="pc-dialog-checkbox"
                    type="checkbox"
                    checked={(values[field.name] as boolean) ?? false}
                    onChange={(event) => setValue(event.target.checked)}
                  />
                  <span className="pc-dialog-field-label">{field.label}</span>
                </label>
              )
            }
            return (
              <label key={field.name} className="pc-dialog-field" htmlFor={id}>
                <span className="pc-dialog-field-label">{field.label}</span>
                <select
                  ref={
                    index === 0
                      ? (firstFieldRef as React.RefObject<HTMLSelectElement>)
                      : undefined
                  }
                  id={id}
                  className="pc-dialog-select"
                  value={(values[field.name] as string) ?? field.defaultValue}
                  onChange={(event) => setValue(event.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
        <div className="pc-dialog-actions">
          <button type="button" className="pc-button" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="pc-button pc-button-primary">
            Insert
          </button>
        </div>
      </form>
    </div>
  )
}
