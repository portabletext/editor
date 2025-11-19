import {createContext} from 'react'

export type PlaygroundFeatureFlags = {
  toolbar: boolean
}

export const defaultPlaygroundFeatureFlags: PlaygroundFeatureFlags = {
  toolbar: true,
}

export const PlaygroundFeatureFlagsContext =
  createContext<PlaygroundFeatureFlags>(defaultPlaygroundFeatureFlags)

export type EditorFeatureFlags = {
  dragHandles: boolean
  imageDeserializerPlugin: boolean
  htmlDeserializerPlugin: boolean
  textFileDeserializerPlugin: boolean
  emojiPickerPlugin: boolean
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
  codeEditorPlugin: false,
  linkPlugin: false,
  oneLinePlugin: false,
  markdownPlugin: true,
  typographyPlugin: true,
}

export const EditorFeatureFlagsContext = createContext<EditorFeatureFlags>(
  defaultEditorFeatureFlags,
)
