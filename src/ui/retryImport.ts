/** Retry a brief module fetch failure without reloading the campaign or hiding programming errors. */
export async function retryImport<T>(load:()=>Promise<T>,wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),moduleName?:string):Promise<T> {
  let failedUrl:URL|undefined;
  for(let attempt=0;;attempt++) {
    try {
      // Browsers can cache a failed module request. A new URL gives a known panel one fresh fetch.
      if(failedUrl) {
        const url=new URL(failedUrl);url.searchParams.set('trp-retry',String(attempt));
        return await import(/* @vite-ignore */ url.href) as T;
      }
      return await load();
    } catch(error) {
      const message=error instanceof Error?error.message:String(error);
      if(attempt>=2||!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(message))throw error;
      const match=message.match(/https?:\/\/[^\s]+/);
      if(moduleName&&match&&typeof window!=='undefined') {
        try {
          const url=new URL(match[0]);
          const file=url.pathname.split('/').pop()??'';
          // Only our own expected panel is retried; a missing dependency is not mistaken for that panel.
          if(url.origin===window.location.origin&&file.startsWith(moduleName)&&/\.(js|tsx)$/.test(file))failedUrl=url;
        } catch { /* Retain the original static loader for errors without a valid module URL. */ }
      }
      await wait(400*(attempt+1));
    }
  }
}
