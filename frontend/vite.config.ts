import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // API calls go directly to localhost:8080 — no proxy needed.
  // Works for `npm run dev` + `cargo run` and Tauri desktop builds alike.
})
