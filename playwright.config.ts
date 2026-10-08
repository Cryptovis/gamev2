import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',timeout:60000,workers:1,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:5182',viewport:{width:1440,height:900},headless:true,trace:'retain-on-failure',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]}},
 webServer:{command:'npm run build && npm run preview -- --host 127.0.0.1 --port 5182 --strictPort',url:'http://127.0.0.1:5182',reuseExistingServer:false,timeout:60000},
});
