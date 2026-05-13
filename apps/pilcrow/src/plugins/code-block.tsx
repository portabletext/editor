import {
  defineContainer,
  useEditor,
  type BlockPath,
} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {schemaDefinition} from '../schema'

/**
 * Code block container. The container owns the language label and a
 * thin left rule; the lines field accepts plain text blocks. The
 * header renders a \`<select>\` so users can switch language without
 * dropping into the JSON inspector. Syntax highlighting in the
 * editor view is layered separately.
 */
const codeBlockLanguages = [
  'text',
  'ts',
  'tsx',
  'js',
  'jsx',
  'json',
  'css',
  'html',
  'markdown',
  'bash',
  'sql',
  'python',
  'go',
  'rust',
  'yaml',
] as const

function LanguageSelect(props: {language: string; path: BlockPath}) {
  const editor = useEditor()
  return (
    <select
      className="pc-code-block-language-select"
      value={props.language}
      onChange={(event) => {
        editor.send({
          type: 'set',
          at: [...props.path, 'language'],
          value: event.target.value,
        } as never)
      }}
    >
      {codeBlockLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
      {!codeBlockLanguages.includes(
        props.language as (typeof codeBlockLanguages)[number],
      ) && <option value={props.language}>{props.language}</option>}
    </select>
  )
}

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  type: 'code-block',
  childField: 'lines',
  render: ({attributes, children, node, path}) => {
    const block = node as {language?: string}
    const language = block.language ?? 'text'
    return (
      <div {...attributes} className="pc-code-block">
        <header className="pc-code-block-header" contentEditable={false}>
          <LanguageSelect language={language} path={path} />
        </header>
        <div className="pc-code-block-body">{children}</div>
      </div>
    )
  },
})

export function CodeBlockPlugin() {
  return (
    <>
      <ContainerPlugin containers={[codeBlockContainer]} />
    </>
  )
}
