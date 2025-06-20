import {StyledInput} from '@/components/styled-input'
import {cn} from '@/lib/utils'
import {IMediaContent} from '@/types/file'
import React from 'react'
import {useDropzone} from 'react-dropzone'
import {toast} from 'sonner'

interface EditorUploaderProps extends React.ComponentProps<'div'> {
  onFileUpload: (files: IMediaContent[]) => void

  placeholder?: string
  trigger: React.JSX.Element
}
export const FileUploader: React.FC<EditorUploaderProps> = ({
  onFileUpload,

  className,
  trigger,
}) => {
  const getBase64String = (file: File): Promise<null | string> => {
    return new Promise(function (resolve, reject) {
      const fr = new FileReader()

      fr.onload = function () {
        resolve(fr.result as string)
      }

      fr.onerror = function () {
        reject(fr)
      }

      fr.readAsDataURL(file)
    })
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const promises = []
    for (const file of acceptedFiles) {
      promises.push(getBase64String(file))
    }

    try {
      const resultArr = await Promise.all(promises)
      const newFiles = acceptedFiles.map(
        (file, index) =>
          ({
            id: file.name + new Date().getTime(),
            name: file.name,
            src: resultArr[index] as string,
            mediaType: file.type,
          }) as IMediaContent,
      )

      if (onFileUpload && newFiles) {
        onFileUpload(newFiles)
      }
    } catch {
      toast.error('There was a problem uploading your file.')
    }
  }

  const {getRootProps, getInputProps, fileRejections} = useDropzone({
    onDrop,
    maxFiles: 10,
    noKeyboard: true,
    noDrag: true,
    maxSize: 5000000,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
      'application/pdf': ['.pdf'],
    },
  })

  if (fileRejections.length !== 0) {
    toast.error(
      'Cannot upload more than 10 images at a time. Images must be less than 5MB and of type png, jpg, or jpeg.',
    )
  }

  return (
    <div {...getRootProps()} className={cn(className)}>
      <StyledInput {...getInputProps()} type="file" />
      {trigger}
    </div>
  )
}
