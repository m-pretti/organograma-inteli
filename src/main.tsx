import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import '@fontsource/platypi/400.css'
import '@fontsource/platypi/500.css'
import '@fontsource/platypi/600.css'
import '@fontsource/platypi/700.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/telas.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
