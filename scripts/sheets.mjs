import {ID,owner} from './core.mjs';
import {read,userView} from './db.mjs';
import {balance} from './model.mjs';
import {sheetWalletHTML} from './wallet-ui.mjs';
const sheets=new Map();
export function sheetData(actor){if(actor?.type!=='character'||!owner(actor,game.user))return null;if(game.user.isGM){const s=read();return {state:s,amount:balance(s,actor.uuid)};}const v=userView(),wallet=v.wallets.find(w=>w.uuid===actor.uuid);if(!wallet||!v.currencies?.length)return null;return {state:v,amount:wallet.balance};}
export function renderWallet(app,html){const root=html?.querySelector?html:html?.[0]??app.element;if(!root?.querySelector)return;sheets.set(app,root);const data=game.settings.get(ID,'showSheetWallet')!==false?sheetData(app.actor):null;const pe=root.querySelector('.se-pe');let el=root.querySelector('.sem-sheet-wallet');if(!data||!pe){el?.remove();return;}if(!el){el=document.createElement('label');el.className='sem-sheet-wallet';pe.append(el);}el.innerHTML=sheetWalletHTML(data.amount,data.state,app.actor.uuid);sheets.set(app,root);}
export function refreshWallets(){for(const [app,root] of sheets){if(root.isConnected===false){sheets.delete(app);continue;}renderWallet(app,root);}}
export function closeWallet(app){sheets.delete(app);}
