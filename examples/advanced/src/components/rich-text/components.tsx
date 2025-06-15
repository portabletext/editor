import {PortableTextComponents} from '@portabletext/react'

export const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({value}) => {
      return (
        <img
          {...value}
          className="size-50 md:size-70 lg:size-100 rounded-md inline-block"
        />
      )
    },
    video: ({value}) => {
      return (
        <video
          className="size-50 md:size-70 lg:size-100 rounded-md inline-block"
          controls
        >
          <source src={value.src} type={value.mediaType} />
        </video>
      )
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
