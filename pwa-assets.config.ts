import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Génère favicon, icônes PWA et icône Apple à partir de public/logo.svg :
//   npx pwa-assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FFFFFF' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#FFFFFF' } },
  },
  images: ['public/logo.svg'],
});
