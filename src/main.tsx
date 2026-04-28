import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'

function syncAppViewportHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${height}px`)
}

syncAppViewportHeight()
window.addEventListener('resize', syncAppViewportHeight)
window.visualViewport?.addEventListener('resize', syncAppViewportHeight)
window.visualViewport?.addEventListener('scroll', syncAppViewportHeight)

// Warmup agresivo: ping cada 3s hasta que Supabase responda
function warmupSupabase() {
  let attempts = 0
  const tryPing = () => {
    attempts++
    supabase.from('profiles').select('id').limit(1).then(({ error }) => {
      if (error && attempts < 5) {
        console.log(`Supabase warmup attempt ${attempts} failed, retrying...`)
        setTimeout(tryPing, 3000)
      } else {
        console.log(`Supabase warmed up after ${attempts} attempt(s)`)
      }
    })
  }
  tryPing()
}

warmupSupabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
