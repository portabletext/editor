import z from 'zod'

export interface IMediaContent {
  id: string
  name?: string
  src: string | undefined
  mediaType: IMediaContentMediaType
}

export const IMediaContentMediaTypeSchema = z.union([
  z.literal('image/png'),
  z.literal('image/jpg'),
  z.literal('image/jpeg'),
  z.literal('text/plain'),
  z.literal('video/mp4'),
  z.literal('video/mov'),
  z.literal('video/avi'),
  z.literal('video/mkv'),
  z.literal('video/webm'),
  z.literal('video/quicktime'),
  z.literal('application/pdf'),
])

export type IMediaContentMediaType = z.infer<
  typeof IMediaContentMediaTypeSchema
>
