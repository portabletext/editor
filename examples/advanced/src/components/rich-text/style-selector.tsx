import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {schemaDefinition} from './schema'

interface StyleProps {
  styles: typeof schemaDefinition.styles
}

export const StyleSelector: React.FC<StyleProps> = ({styles}) => {
  const editor = useEditor()
  const activeStyle = useEditorSelector(editor, selectors.getActiveStyle)

  return (
    <Select
      onValueChange={(style) => {
        editor.send({type: 'style.toggle', style})
      }}
      value={activeStyle}
    >
      <SelectTrigger className="w-[5rem] text-xs">
        <SelectValue placeholder="select style" />
      </SelectTrigger>
      <SelectContent>
        {styles.map((style) => (
          <SelectItem key={style.name} value={style.name}>
            {style.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
