import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true, // accesible desde el iPad en la red local
  },
  build: {
    // Todo va al bundle: en el evento no se pide nada a la red.
    assetsInlineLimit: 0,
  },
});
