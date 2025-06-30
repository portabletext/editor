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
  textFileDeserializerPlugin: boolean
  emojiPickerPlugin: boolean
  codeEditorPlugin: boolean
  linkPlugin: boolean
  oneLinePlugin: boolean
  markdownPlugin: boolean
}

export const defaultEditorFeatureFlags: EditorFeatureFlags = {
  dragHandles: false,
  imageDeserializerPlugin: false,
  textFileDeserializerPlugin: false,
  emojiPickerPlugin: false,
  codeEditorPlugin: false,
  linkPlugin: false,
  oneLinePlugin: false,
  markdownPlugin: false,
}

export const EditorFeatureFlagsContext = createContext<EditorFeatureFlags>(
  defaultEditorFeatureFlags,
)
