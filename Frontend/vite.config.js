import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),react()],
    server: {
  proxy: {
    '/officers': 'https://traffic-remover.onrender.com', // or wherever your backend runs
  }
}
})

