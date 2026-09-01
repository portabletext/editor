import type {DocumentHandle, DocumentResource} from '@sanity/sdk-react'

type DocumentHandleWithLegacySource = DocumentHandle & {
  source?: DocumentResource
}

export function normalizeDocumentHandle<T extends DocumentHandle>(
  handle: T & DocumentHandleWithLegacySource,
): Omit<T, 'source'> {
  const {source, ...normalizedHandle} = handle

  if (normalizedHandle.resource !== undefined || source === undefined) {
    return normalizedHandle
  }

  return {...normalizedHandle, resource: source}
}
