import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './layout.css'
import './chat.css'
import './dashboard.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)