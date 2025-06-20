import {Alert} from '@/components/alert'
import {Pdf} from '@/components/pdf'
import {Video} from '@/components/video'
import {PortableTextComponents} from '@portabletext/react'

export const portableTextComponents: PortableTextComponents = {
  types: {
    media: ({value}) => {
      const mediaType = value.mediaType
      if (mediaType.includes('image')) {
        return (
          <img
            title={value.name}
            src={value.src}
            className="size-50 md:size-60 lg:size-80 inline-block"
          />
        )
      } else if (mediaType.includes('video')) {
        return (
          <Video
            className="size-50 md:size-60 lg:size-80 rounded-md inline-block"
            src={value.src}
            mediaType={value.mediaType}
            controls={true}
          />
        )
      } else if (mediaType.includes('pdf')) {
        return (
          <Pdf
            name={value.name}
            src={value.src}
            mediaType={value.mediaType}
            className="m-2"
          />
        )
      } else {
        return <Alert type="error" message="Unrecognized media type" />
      }
    },
    link: ({value}) => {
      return (
        <a href={value?.url} target="_blank" rel="noopener noreferrer">
          {value?.name}
        </a>
      )
    },
  },

  // block: {
  //   normal: ({ children }) => <>{children}</>,
  // },
}
