import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-map-gl/mapbox': path.resolve(__dirname, './node_modules/react-map-gl/dist/mapbox.js'),
    },
  },
  server: {
    host: true,   // exposes on 0.0.0.0 so your phone can reach it
    port: 5173,
  },
})
