import {createContext} from 'react'

export type FeatureFlags = {
  dragHandles: boolean
  imageDeserializerPlugin: boolean
  textFileDeserializerPlugin: boolean
  emojiPickerPlugin: boolean
  codeEditorPlugin: boolean
  linkPlugin: boolean
  oneLinePlugin: boolean
  markdownPlugin: boolean
}

export const defaultFeatureFlags: FeatureFlags = {
  dragHandles: false,
  imageDeserializerPlugin: false,
  textFileDeserializerPlugin: false,
  emojiPickerPlugin: false,
  codeEditorPlugin: false,
  linkPlugin: false,
  oneLinePlugin: false,
  markdownPlugin: false,
}

export const FeatureFlagsContext =
  createContext<FeatureFlags>(defaultFeatureFlags)
