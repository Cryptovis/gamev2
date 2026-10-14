export class AutosaveCoordinator {
 private pending=new Map<string,Promise<boolean>>();
 private saved=new Set<string>();
 private writes:Promise<unknown>=Promise.resolve();
 /** Serialize snapshots so an older in-flight checkpoint cannot overwrite a newer flush. */
 private write(key:string,write:()=>Promise<unknown>):Promise<boolean> {
  const operation=this.writes.then(write).then(()=>{this.saved.add(key);if(this.saved.size>64)this.saved.delete(this.saved.values().next().value!);return true;},()=>false);
  this.writes=operation;
  return operation;
 }
 /** Refresh even a saved day: commands can change the campaign while its clock is paused. */
 saveLatest(key:string,write:()=>Promise<unknown>):Promise<boolean> {return this.write(key,write);}
 /** `write` may be shared with later callers of the same key, so it must not depend on any caller's lifetime (e.g. an effect's `cancelled` flag). */
 async save(key:string,write:()=>Promise<unknown>):Promise<boolean> {
  if(this.saved.has(key))return true;
  const pending=this.pending.get(key);if(pending)return pending;
  const operation=this.write(key,write).finally(()=>this.pending.delete(key));
  this.pending.set(key,operation);return operation;
 }
 isSaved(key:string){return this.saved.has(key);}
}

/** Runs one autosave checkpoint with retry. Cancellation only silences this caller's report/retry; it never fails the shared write. */
export function startAutosave(coordinator:AutosaveCoordinator,key:string,write:()=>Promise<unknown>,report:(ok:boolean)=>void):()=>void {
 let cancelled=false,attempt=0,timer:ReturnType<typeof setTimeout>|undefined;
 const run=async()=>{
  const ok=await coordinator.save(key,write);
  if(cancelled)return;
  report(ok);
  if(!ok)timer=setTimeout(run,Math.min(30000,3000*2**attempt++));
 };
 void run();
 return ()=>{cancelled=true;if(timer!==undefined)clearTimeout(timer);};
}
