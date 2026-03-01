import {useSelector} from '@xstate/react'
import {SettingsIcon} from 'lucide-react'
import {DialogTrigger, TooltipTrigger} from 'react-aria-components'
import type {EditorActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Popover} from './primitives/popover'
import {Separator} from './primitives/separator'
import {Switch} from './primitives/switch'
import {Tooltip} from './primitives/tooltip'

export function EditorSettingsPopover(props: {editorRef: EditorActorRef}) {
  const featureFlags = useSelector(
    props.editorRef,
    (s) => s.context.featureFlags,
  )

  const toggleFlag = (flag: keyof typeof featureFlags) => {
    props.editorRef.send({type: 'toggle feature flag', flag})
  }

  return (
    <DialogTrigger>
      <TooltipTrigger>
        <Button variant="ghost" size="sm">
          <SettingsIcon className="size-3" />
        </Button>
        <Tooltip>Plugins</Tooltip>
      </TooltipTrigger>
      <Popover placement="top">
        <div className="flex flex-col gap-3 min-w-64 max-h-80 overflow-y-auto">
          {/* Experimental */}
          <Section title="Experimental">
            <FeatureSwitch
              label="Drag handles"
              isSelected={featureFlags.dragHandles}
              onChange={() => toggleFlag('dragHandles')}
            />
          </Section>

          <Separator orientation="horizontal" />

          {/* Typing */}
          <Section title="Typing">
            <FeatureSwitch
              label="Markdown shortcuts"
              isSelected={featureFlags.markdownPlugin}
              onChange={() => toggleFlag('markdownPlugin')}
            />
            <FeatureSwitch
              label="One-line mode"
              isSelected={featureFlags.oneLinePlugin}
              onChange={() => toggleFlag('oneLinePlugin')}
            />
            <FeatureSwitch
              label="Emoji picker"
              isSelected={featureFlags.emojiPickerPlugin}
              onChange={() => toggleFlag('emojiPickerPlugin')}
            />
            <FeatureSwitch
              label="Mention picker"
              isSelected={featureFlags.mentionPickerPlugin}
              onChange={() => toggleFlag('mentionPickerPlugin')}
            />
            <FeatureSwitch
              label="Slash commands"
              isSelected={featureFlags.slashCommandPlugin}
              onChange={() => toggleFlag('slashCommandPlugin')}
            />
            <FeatureSwitch
              label="Code editor"
              isSelected={featureFlags.codeEditorPlugin}
              onChange={() => toggleFlag('codeEditorPlugin')}
            />
            <FeatureSwitch
              label="Typography"
              isSelected={featureFlags.typographyPlugin}
              onChange={() => toggleFlag('typographyPlugin')}
            />
            <FeatureSwitch
              label="Markdown editor"
              isSelected={featureFlags.markdownEditorPlugin}
              onChange={() => toggleFlag('markdownEditorPlugin')}
            />
          </Section>

          <Separator orientation="horizontal" />

          {/* Deserializers */}
          <Section title="Paste Handlers">
            <FeatureSwitch
              label="Link pasting"
              isSelected={featureFlags.linkPlugin}
              onChange={() => toggleFlag('linkPlugin')}
            />
            <FeatureSwitch
              label="Image files"
              isSelected={featureFlags.imageDeserializerPlugin}
              onChange={() => toggleFlag('imageDeserializerPlugin')}
            />
            <FeatureSwitch
              label="HTML content"
              isSelected={featureFlags.htmlDeserializerPlugin}
              onChange={() => toggleFlag('htmlDeserializerPlugin')}
            />
            <FeatureSwitch
              label="Text files"
              isSelected={featureFlags.textFileDeserializerPlugin}
              onChange={() => toggleFlag('textFileDeserializerPlugin')}
            />
          </Section>
        </div>
      </Popover>
    </DialogTrigger>
  )
}

function Section(props: {title: string; children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {props.title}
      </span>
      <div className="flex flex-col gap-1.5">{props.children}</div>
    </div>
  )
}

function FeatureSwitch(props: {
  label: string
  isSelected: boolean
  onChange: () => void
}) {
  return (
    <Switch isSelected={props.isSelected} onChange={props.onChange}>
      <span className="text-sm">{props.label}</span>
    </Switch>
  )
}
