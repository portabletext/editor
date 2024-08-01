import type {Config} from 'tailwindcss'

export default {
  content: ['../playground/src/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
} satisfies Config
