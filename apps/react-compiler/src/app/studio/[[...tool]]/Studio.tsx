'use client'

import {Studio} from 'sanity'
import config from 'sanity-studio/sanity.config'

export default function StudioPage() {
  return <Studio config={config} basePath="/studio" />
}
