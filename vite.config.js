import { defineConfig } from 'vite';
// base relative : fonctionne dans l'APK (Capacitor) et sur GitHub Pages (/chkobba-virage/)
export default defineConfig({ base: './', build: { target: 'es2020' } });
