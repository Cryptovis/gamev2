import {defineConfig} from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({...base,testDir:'.',testMatch:'visual.spec.ts',timeout:1800000,use:{...base.use,trace:'off',actionTimeout:10000}});
