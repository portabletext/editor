import {cn} from '@/lib/utils'
import {FileText} from 'lucide-react'
import {ComponentProps} from 'react'
import {toast} from 'sonner'

interface PdfProps extends ComponentProps<'div'> {
  name: string | undefined
  src: string | undefined
  mediaType: string | undefined
}

const openinNewWindow = (
  src: string | undefined,
  mediaType: string | undefined,
) => {
  if (!src || !mediaType) {
    toast.error('Source or MediaType must be provided to open the PDF')
    return
  }
  try {
    const newWindow = window.open(
      '',
      'pictureViewer',
      `location=no, directories=no, fullscreen=no`,
    )

    if (!newWindow) {
      return
    }

    newWindow.document.writeln('<html>')
    newWindow.document.writeln("<body style='margin: 0 0 0 0;'>")
    newWindow.document.writeln(
      `<embed src="${src}" type="${mediaType}" height="100%" width="100%" />`,
    )
    newWindow.document.writeln('</body></html>')
    newWindow.document.close()
  } catch {
    toast.error('Could not open PDF in a new window')
  }
}

export const Pdf: React.FC<PdfProps> = ({name, src, mediaType, className}) => (
  <div
    className={cn(
      'cursor-pointer flex flex-col items-center justify-center p-2 max-h-24 max-w-24 bg-foreground-dark-30/60 rounded-md hover:brightness-120',
      className,
    )}
    onClick={() => openinNewWindow(src, mediaType)}
  >
    <FileText className="size-10 stroke-1" />
    <div className="text-xs mb-1">{name}</div>
  </div>
)
