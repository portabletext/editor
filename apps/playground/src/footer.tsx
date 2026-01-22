export function Footer() {
  return (
    <footer className="flex items-center justify-center px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
      <span>
        Made with{' '}
        <span className="text-red-500" role="img" aria-label="love">
          &#9829;
        </span>{' '}
        by{' '}
        <a
          href="https://www.sanity.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
        >
          Sanity.io
        </a>{' '}
        &middot;{' '}
        <a
          href="https://github.com/portabletext/editor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
        >
          Open Source
        </a>
      </span>
    </footer>
  )
}
