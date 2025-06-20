import {cn} from '@/lib/utils'

interface VideoProps extends Partial<HTMLVideoElement> {
  src: string
  mediaType: string
}

export const Video: React.FC<VideoProps> = ({
  src,
  mediaType,
  className,
  controls,
}) => {
  return (
    <video controls={controls} className={cn('', className)} playsInline muted>
      <source src={src} type={mediaType} />
    </video>
  )
}
