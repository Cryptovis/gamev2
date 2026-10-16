import {useEffect,useState} from 'react';

const read=():'dark'|'light'=>typeof document!=='undefined'&&document.documentElement.dataset.theme==='light'?'light':'dark';

/** The theme the page is showing right now (data-theme on <html>, set by the appearance store), kept current when it changes. */
export function useDocumentTheme():'dark'|'light' {
  const [theme,setTheme]=useState(read);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setTheme(read()));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    setTheme(read());
    return ()=>observer.disconnect();
  },[]);
  return theme;
}
