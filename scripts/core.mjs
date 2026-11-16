import {validateImageFields} from './images.mjs';
export const ID='sangue-escuro-saques-mercantes';
export const all=c=>c?.contents??Array.from(c?.values?.()??c??[]);
export const copy=x=>structuredClone(x);
export const uid=()=>foundry.utils.randomID();
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const text=(x,n=180)=>String(x??'').trim().slice(0,n);
export const get=(o,k)=>k.split('.').reduce((o,k)=>o?.[k],o);
export const flag=(d,k)=>d?.getFlag?.(ID,k)??d?.flags?.[ID]?.[k];
export const owner=(a,u)=>!!a&&(u.isGM||a.testUserPermission?.(u,3)===true);
export const activeGM=()=>game.user.isGM&&game.users.activeGM?.id===game.user.id;
export const gm=u=>{if(!(u??game.user)?.isGM)throw Error('Operação exclusiva do Mestre.');};
export function integer(x,min=0,max=1e12){const n=Number(x);if(x===''||x==null||!Number.isSafeInteger(n)||n<min||n>max)throw Error('Informe um número inteiro válido.');return n;}
export function real(x,min=0,max=1e6){const n=Number(x);if(x===''||x==null||!Number.isFinite(n)||n<min||n>max)throw Error('Valor numérico inválido.');return n;}
export function asset(x){x=text(x,1800);if(/[\u0000-\u001f<>"'\\]/.test(x)||x.startsWith('//')||/^[a-z][a-z0-9+.-]*:/i.test(x)&&!/^https?:\/\//i.test(x))throw Error('Use uma imagem do Foundry ou URL HTTP/HTTPS.');return x;}
const stable=o=>o&&typeof o==='object'?Array.isArray(o)?o.map(stable):Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])])):o;
export const equal=(a,b)=>JSON.stringify(stable(a??null))===JSON.stringify(stable(b??null));
export const now=()=>Date.now();
export const safe=fn=>async(...a)=>{try{return await fn(...a);}catch(e){console.error(ID,e);ui.notifications.warn(e.message);}};
export const ask=(title,content)=>foundry.applications.api.DialogV2.confirm({window:{title},content});
export async function form(title,content,readForm=null){return foundry.applications.api.DialogV2.prompt({classes:['sem-dialog'],position:{width:650},window:{title},content:`<div class="sem-form">${content}</div>`,rejectClose:false,ok:{label:'Confirmar',callback:async(e,b)=>{const data=readForm?readForm(b.form):new foundry.applications.ux.FormDataExtended(b.form).object;await validateImageFields(b.form);return data;}}});}
export const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
export const select=(name,rows,value)=>`<select name="${name}">${Object.entries(rows).map(([k,v])=>`<option value="${esc(k)}"${String(value)===k?' selected':''}>${esc(v)}</option>`).join('')}</select>`;
export const check=(name,label,value=false)=>`<label class="sem-check"><input type="checkbox" name="${name}"${value?' checked':''}>${label}</label>`;
export const textarea=(name,label,value='')=>`<label>${label}<textarea name="${name}" rows="4">${esc(value)}</textarea></label>`;
export const enrich=(html,secrets=false)=>foundry.applications.ux.TextEditor.implementation.enrichHTML(html??'',{secrets,async:true});
export const ref=async uuid=>{if(!uuid||typeof uuid!=='string'||uuid.length>500)throw Error('Referência inválida.');const d=await fromUuid(uuid);if(!d)throw Error('Documento não encontrado: '+uuid);return d;};
let chain=Promise.resolve();export function serial(fn){const p=chain.catch(()=>{}).then(fn);chain=p;return p;}
