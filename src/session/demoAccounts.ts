// Local demo profiles only. These records do not authenticate an online service.
interface DemoAccount {username:string;email:string;salt:string;hash:string}
const ACCOUNT_KEY='trp-demo-accounts-v1',SESSION_KEY='trp-demo-session-v1';
const encode=(bytes:Uint8Array)=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const decode=(text:string)=>Uint8Array.from(text.match(/.{2}/g)??[],x=>parseInt(x,16));
const normalize=(text:string)=>text.trim().toLowerCase();
function accounts():DemoAccount[]{try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)??'[]');}catch{return [];}}
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return encode(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations:210000},key,256)));}
export function demoOwner(){try{return sessionStorage.getItem(SESSION_KEY)??'guest';}catch{return 'guest';}}
export function hasDemoSession(){try{return sessionStorage.getItem(SESSION_KEY)!==null;}catch{return false;}}
export function leaveDemoSession(){sessionStorage.removeItem(SESSION_KEY);}
export function enterDemoSession(username='guest'){sessionStorage.setItem(SESSION_KEY,username);}
export interface DemoSessionInfo {username:string;kind:'guest'|'profile';}
/**
 * Makes sure this tab has a demo session and describes it. With no session yet it starts the guest one; an existing
 * guest or profile session is left as it is, so calling it again changes nothing. It asks for no credentials and never
 * touches mathChallenge, which only the registration form uses. Blocked storage does not throw: the tab then behaves as guest.
 */
export function ensureGuestSession():DemoSessionInfo {
  if(!hasDemoSession()){try{enterDemoSession('guest');}catch{/* storage blocked: demoOwner() falls back to guest */}}
  const username=demoOwner();
  return {username,kind:username==='guest'?'guest':'profile'};
}
export function mathChallenge(){const bytes=crypto.getRandomValues(new Uint8Array(2));const a=bytes[0]%9+1,b=bytes[1]%9+1;return {question:`${a} + ${b}`,answer:a+b};}
export async function registerDemoAccount(username:string,email:string,password:string){
 const name=normalize(username),mail=normalize(email);
 if(name==='guest')throw Error('Choose a username other than guest.');
 if(!/^[a-z0-9_-]{3,24}$/.test(name))throw Error('Use 3–24 letters, numbers, underscores or dashes.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||mail.length>254)throw Error('Enter a valid email address.');
 if(password.length<8||password.length>128)throw Error('Use a password with 8–128 characters.');
 const current=accounts();if(current.some(a=>a.username===name||a.email===mail))throw Error('This username or email is already used on this device.');
 const salt=encode(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt);
 const latest=accounts();if(latest.some(a=>a.username===name||a.email===mail))throw Error('This username or email is already used on this device.');
 localStorage.setItem(ACCOUNT_KEY,JSON.stringify([...latest,{username:name,email:mail,salt,hash}]));enterDemoSession(name);return name;
}
export async function loginDemoAccount(username:string,password:string){
 const account=accounts().find(a=>a.username===normalize(username));if(!account||await passwordHash(password,account.salt)!==account.hash)throw Error('Username or password is incorrect.');enterDemoSession(account.username);return account.username;
}
