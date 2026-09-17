import {createRoot} from 'react-dom/client'
import {App} from './App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('missing #root element')
}
createRoot(container).render(<App />)
