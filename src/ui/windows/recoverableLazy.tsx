import {lazy, Suspense, useMemo, useState, type ComponentType, type ComponentProps} from 'react';
import {ErrorBoundary} from '../ErrorBoundary';
import {retryImport} from '../retryImport';
import {CommandWindow} from '../panels/CommandWindow';
import {LocaleText} from '../../i18n/localeText';
import {useGameStore} from '../../store/gameStore';

/** A rejected React.lazy object must be replaced, not merely remounted, for manual retry to work. */
export function recoverableLazy<M,T extends ComponentType<any>>(load:()=>Promise<M>,select:(module:M)=>T,moduleName:string) {
 return function RecoverablePanel(props:ComponentProps<T>) {
  const [attempt,setAttempt]=useState(0);
  const Loaded=useMemo(()=>lazy(()=>retryImport(load,undefined,moduleName).then(module=>({default:select(module)}))),[attempt]);
  const close=useGameStore(s=>s.closeWorkspace);
  return <ErrorBoundary key={attempt} title="This window could not open." fallback={error=><CommandWindow kicker="COMMAND" title="This window could not open." onClose={close}>
   <div className="panel-load-error" role="alert" data-testid="panel-load-error"><p><LocaleText value="Your campaign remains open. Try again or close this window."/></p><pre>{error.message}</pre><button onClick={()=>setAttempt(n=>n+1)}><LocaleText value="Try again"/></button><button onClick={close}><LocaleText value="Close window"/></button></div>
  </CommandWindow>}><Suspense fallback={<p className={moduleName==='ResourceCommandWindow'||moduleName==='HelpPanel'||/Window$/.test(moduleName)?'panel-loading panel-loading-floating':'panel-loading'} role="status"><LocaleText value="Loading command…"/></p>}><Loaded {...props}/></Suspense></ErrorBoundary>;
 };
}
