import {defineConfig} from '@playwright/test';
import base from '../playwright.config';
// Profiling build (RON_PROFILE=1) is built into dist-profile and served on its own port so it never shares dist/ with release checks.
export default defineConfig({...base,testDir:'.',testMatch:'renders.spec.ts',timeout:1200000,use:{...base.use,baseURL:'http://127.0.0.1:5183',trace:'off'},
 webServer:{command:'RON_PROFILE=1 npx vite build && RON_PROFILE=1 npx vite preview --host 127.0.0.1 --port 5183 --strictPort',url:'http://127.0.0.1:5183',reuseExistingServer:false,timeout:180000}});
