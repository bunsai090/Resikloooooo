import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-map-gl/mapbox': 'react-map-gl/dist/mapbox.js',
    },
  },
  server: {
    host: true,   // exposes on 0.0.0.0 so your phone can reach it
    port: 5173,
  },
})
