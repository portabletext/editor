import {createContext} from 'react'

export type PlaygroundFeatureFlags = {
  toolbar: boolean
  yjsMode: boolean
  yjsLatency: number
}

export const defaultPlaygroundFeatureFlags: PlaygroundFeatureFlags = {
  toolbar: true,
  yjsMode: false,
  yjsLatency: 0,
}

export const PlaygroundFeatureFlagsContext =
  createContext<PlaygroundFeatureFlags>(defaultPlaygroundFeatureFlags)

export type EditorFeatureFlags = {
  dragHandles: boolean
  imageDeserializerPlugin: boolean
  htmlDeserializerPlugin: boolean
  textFileDeserializerPlugin: boolean
  emojiPickerPlugin: boolean
  mentionPickerPlugin: boolean
  slashCommandPlugin: boolean
  codeEditorPlugin: boolean
  linkPlugin: boolean
  oneLinePlugin: boolean
  markdownPlugin: boolean
  typographyPlugin: boolean
}

export const defaultEditorFeatureFlags: EditorFeatureFlags = {
  dragHandles: false,
  imageDeserializerPlugin: false,
  htmlDeserializerPlugin: true,
  textFileDeserializerPlugin: false,
  emojiPickerPlugin: true,
  mentionPickerPlugin: true,
  slashCommandPlugin: true,
  codeEditorPlugin: false,
  linkPlugin: true,
  oneLinePlugin: false,
  markdownPlugin: true,
  typographyPlugin: true,
}

export const EditorFeatureFlagsContext = createContext<EditorFeatureFlags>(
  defaultEditorFeatureFlags,
)
