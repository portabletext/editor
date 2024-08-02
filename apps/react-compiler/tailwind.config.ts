import type {Config} from 'tailwindcss'

export default {
  content: [
    './node_modules/playground/index.html',
    './node_modules/playground/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
} satisfies Config
