import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/explorer/',
  // maplibre-gl's worker is an ES module and imports a sibling chunk, so it
  // has to be bundled as one (see WORKER_URL in ExplorerMap).
  worker: { format: 'es' },
});
