import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_react: ['react', 'react-dom'],
          vendor_motion: ['framer-motion'],
          vendor_charts: ['recharts'],
          vendor_pdf: ['jspdf', 'jspdf-autotable'],
        }
      }
    }
  }
})
