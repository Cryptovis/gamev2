export class AutosaveCoordinator {
 private pending=new Map<string,Promise<boolean>>();
 private saved=new Set<string>();
 async save(key:string,write:()=>Promise<unknown>):Promise<boolean> {
  if(this.saved.has(key))return true;
  const pending=this.pending.get(key);if(pending)return pending;
  const operation=Promise.resolve().then(write).then(()=>{this.saved.add(key);if(this.saved.size>64)this.saved.delete(this.saved.values().next().value!);return true;},()=>false).finally(()=>this.pending.delete(key));
  this.pending.set(key,operation);return operation;
 }
}
