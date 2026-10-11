import {defineConfig} from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({...base,testDir:'.',testMatch:'browser.spec.ts',timeout:180000,use:{...base.use,trace:'off'}});
