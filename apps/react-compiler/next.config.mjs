function requireResolve(id) {
  return import.meta.resolve(id).replace('file://', '')
}

const reactCompiler = true
const reactProductionProfiling = true
const productionBrowserSourceMaps = reactCompiler || reactProductionProfiling

// eslint-disable-next-line tsdoc/syntax
/** @type {import('next').NextConfig} */
const config = {
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    // Support the ability to debug log the studio, for example `DEBUG="sanity:pte:* pnpm dev:react-compiler"`
    DEBUG: process.env.DEBUG,
  },
  transpilePackages: ['@portabletext/editor', '@portabletext/patches', 'sanity-studio'],
  // eslint-disable-next-line @typescript-eslint/no-shadow
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@portabletext/editor': requireResolve('../../packages/editor/src/index.ts'),
      '@portabletext/patches': requireResolve('../../packages/patches/src/index.ts'),
      'sanity/_internal': requireResolve('sanity/_internal'),
      'sanity/_singletons': requireResolve('sanity/_singletons'),
      'sanity/_createContext': requireResolve('sanity/_createContext'),
      'sanity/cli': requireResolve('sanity/cli'),
      'sanity/desk': requireResolve('sanity/desk'),
      'sanity/presentation': requireResolve('sanity/presentation'),
      'sanity/router': requireResolve('sanity/router'),
      'sanity/structure': requireResolve('sanity/structure'),
      'sanity/migrate': requireResolve('sanity/migrate'),
      'sanity': requireResolve('sanity'),
      'styled-components': requireResolve(
        'styled-components/dist/styled-components.browser.esm.js',
      ),
    }
    return config
  },
  productionBrowserSourceMaps,
  reactProductionProfiling,
  experimental: {
    reactCompiler,
  },
}
export default config
