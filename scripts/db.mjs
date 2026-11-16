import {ID,all,copy,esc,activeGM} from './core.mjs';
import {fresh} from './model.mjs';
const PAGE='Dados de Saques e Mercantes';
const content=s=>'<pre>'+esc(JSON.stringify(s))+'</pre>';
const decode=s=>s.replace(/^\s*<pre[^>]*>/,'').replace(/<\/pre>\s*$/,'').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&amp;','&');
export const document=()=>game.journal.get(game.settings.get(ID,'database'));
const page=d=>d?.pages.find(p=>p.name===PAGE);
export function read(){if(!game.user.isGM)throw Error('Banco reservado ao Mestre.');const p=page(document());if(!p)return fresh();const s=JSON.parse(decode(p.text.content));if(s.schema!==1)throw Error('Formato de dados desconhecido.');return s;}
export async function ensure(){if(!activeGM())throw Error('Um Mestre ativo é necessário.');let d=document();if(!d){d=all(game.journal).find(d=>d.getFlag(ID,'database'));if(!d)d=await JournalEntry.create({name:'Saques e Mercantes — Livro do Mestre',ownership:{default:0},flags:{[ID]:{database:true}},pages:[{name:PAGE,type:'text',ownership:{default:0},text:{format:1,content:content(fresh())}}]});await game.settings.set(ID,'database',d.id);}if(!page(d))throw Error('Página do banco removida. Restaure o backup; nada será sobrescrito.');return d;}
export async function save(s){await ensure();await page(document()).update({'text.content':content(s)});Hooks.callAll('saquesMercantes.changed');}
export function userView(){if(game.user.isGM)return null;const map=game.settings.get(ID,'views')??{},d=game.journal.get(map[game.user.id])??all(game.journal).find(d=>d.getFlag(ID,'viewFor')===game.user.id),p=page(d);if(!p)return {wallets:[],entities:[],sessions:[],identifications:[],busy:false};try{return JSON.parse(decode(p.text.content));}catch{return {wallets:[],entities:[],sessions:[],identifications:[],busy:false};}}
export async function writeView(user,data){if(!activeGM())return;const map=copy(game.settings.get(ID,'views')??{});let d=game.journal.get(map[user.id]);if(!d){d=all(game.journal).find(d=>d.getFlag(ID,'viewFor')===user.id);if(!d)d=await JournalEntry.create({name:'Saques e Mercantes — '+user.name,ownership:{default:0,[user.id]:2},flags:{[ID]:{viewFor:user.id}},pages:[{name:PAGE,type:'text',ownership:{default:-1},text:{format:1,content:content(data)}}]});map[user.id]=d.id;await game.settings.set(ID,'views',map);}
 const p=page(d);if(!p)throw Error('Página da visão do jogador removida.');const html=content(data);if(p.text.content!==html)await p.update({'text.content':html});}
