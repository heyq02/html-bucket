import { BaseStyles } from '@primer/react'
import { ThemeProvider } from '@primer/react/next'

import '@primer/primitives/dist/css/functional/themes/light.css'
import '@primer/primitives/dist/css/functional/themes/dark.css'
import '@primer/primitives/dist/css/functional/size/radius.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App.tsx'

const root = document.querySelector('#root')
if (!root) {
  throw new Error('Root element #root not found')
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider colorMode='auto'>
      <BaseStyles>
        <App />
      </BaseStyles>
    </ThemeProvider>
  </StrictMode>
)
