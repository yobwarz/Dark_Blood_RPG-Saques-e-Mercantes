/** Integração de registros privados com o armazenamento da Logística. */
import {ID,all,copy,uid,activeGM,owner,integer,equal,serial} from './core.mjs';
import {read,save,ensure} from './db.mjs';
import * as A from './adapter.mjs';
const LOG='sangue-escuro-logistica';
export const storageBusy=s=>Object.values(s.storageTransfers??{}).some(p=>['prepared','committed'].includes(p.phase));
export function storagePending(s){const p=Object.values(s.storageTransfers??{}).find(p=>['prepared','committed'].includes(p.phase));return p?{id:p.id,kind:'logistica',name:'Transferência com Expedições e Abrigos',phase:p.phase}:null;}
const authorize=()=>{if(!activeGM()||!game.modules.get(LOG)?.active)throw Error('A integração exige o Mestre ativo e a Logística habilitada.');};
const state=()=>game.settings.get(LOG,'dados');
function transaction(id){const t=state()?.transacoes?.find(t=>t.id===id);if(!t)throw Error('Intenção de transferência não encontrada na Logística.');return t;}
function slot(t,id=t.item){return state()?.abrigos.find(a=>a.id===t.abrigo)?.depositos.find(d=>d.id===t.deposito)?.itens.find(e=>e.id===id);}
const location=(t,id)=>({module:LOG,abrigo:t.abrigo,deposito:t.deposito,entryId:id});
const sameLocation=(r,t)=>r?.location&&equal(r.location,location(t,t.item));
const count=d=>d.type==='equipamento'?integer(d.system.quantidade,0,1e6):1;
const clean=A.clean;
function fragment(s,sourceRecord,data,n,target){
 if(!sourceRecord)return {data:A.part(data,n),record:null};
 const steps=[],temp={records:{}};A.delivery(temp,{data:sourceRecord.unknown?sourceRecord.data:data,qty:n,identified:!sourceRecord.unknown,priceBase:sourceRecord.priceBase,alias:sourceRecord.alias,unknownDescription:sourceRecord.unknownDescription},{uuid:target},n,steps);
 const record=Object.values(temp.records)[0];return {data:steps[0].data,record,id:steps[0].id};
}
function remainingData(record,data,n){if(!n)return null;const out=clean(data);if(out.type==='equipamento')out.system.quantidade=n;if(record?.unknown)out.system.compartimentosFixos=A.space(A.part(record.data,n));return out;}
function recordRemaining(r,data,n){if(!r||!n)return null;const next=copy(r);next.data=A.part(r.unknown?r.data:data,n);return next;}
function notify(){game.modules.get(ID)?.api?.sync?.();Hooks.callAll('saquesMercantes.refresh');}
async function unlock(p){for(const ref of p.locks??[]){const a=await A.actor(ref.actorUuid),i=a.items.get(ref.itemId);if(i?.flags?.[ID]?.lock===p.id)await i.update({['flags.'+ID+'.lock']:null},{saquesStorageTransaction:p.id});}}
function close(s,p,phase){s.storageTransfers[p.id]={id:p.id,phase,publicPlan:copy(p.publicPlan)};}
/** Recuperação conservadora de transferências completas da versão anterior. */
export async function recoverLegacyRecord(s,item=null,stored=null){
 if(!activeGM()||!game.modules.get(LOG)?.active)return null;
 const data=item?clean(item):stored?.entry?.dados,id=data?.flags?.[ID]?.record,r=s.records[id];if(!r||r.location)return null;
 const log=state();if(!log)return null;const total=count(r.data),pieces=[];
 const actors=[...all(game.actors),...all(game.scenes).flatMap(sc=>all(sc.tokens).map(t=>t.actor).filter(Boolean))];
 for(const a of new Map(actors.map(a=>[a.uuid,a])).values())for(const i of all(a.items))if(i.flags?.[ID]?.record===id&&A.qty(i)>0)pieces.push({item:i});
 for(const a of log.abrigos)for(const d of a.depositos)for(const e of d.itens)if(e.dados.flags?.[ID]?.record===id&&count(e.dados)>0)pieces.push({entry:e,abrigo:a.id,deposito:d.id});
 if(pieces.length!==1)return null;const piece=pieces[0];if(item&&piece.item!==item||stored&&(piece.entry?.id!==stored.entry.id||piece.abrigo!==stored.t.abrigo||piece.deposito!==stored.t.deposito))return null;
 if(count(data)!==total)return null;
 let deposit,withdraw;
 if(item){withdraw=log.transacoes.find(t=>t.id===data.flags?.[LOG]?.transferencia&&t.estado==='concluida'&&t.direcao==='retirar'&&t.ator===item.parent.uuid&&t.quantidade===total);if(!withdraw)return null;deposit=log.transacoes.find(t=>t.id===withdraw.item&&t.abrigo===withdraw.abrigo&&t.deposito===withdraw.deposito);}
 else deposit=log.transacoes.find(t=>t.id===stored.entry.id&&t.abrigo===stored.t.abrigo&&t.deposito===stored.t.deposito);
 if(!deposit||deposit.estado!=='concluida'||deposit.direcao!=='depositar'||deposit.ator!==r.actorUuid||deposit.sourceId!==r.itemId||deposit.quantidade!==total||deposit.dados.flags?.[ID]?.record!==id)return null;
 const origin=await fromUuid(r.actorUuid),old=origin?.items.get(r.itemId);if(old&&A.qty(old)>0)return null;
 let expected=A.part(deposit.dados,total);if(withdraw){if(withdraw.dados.flags?.[ID]?.record!==id)return null;expected=A.part(withdraw.dados,total);expected.flags??={};expected.flags[LOG]={...expected.flags[LOG],transferencia:withdraw.id};}
 if(!equal(clean(data),clean(expected)))return null;
 if(item){r.actorUuid=item.parent.uuid;r.itemId=item.id;delete r.location;}else{r.actorUuid=null;r.itemId=null;r.location=location(stored.t,stored.entry.id);}
 s.history.push({id:uid(),time:Date.now(),user:game.user.id,kind:'legacy-storage-link',note:'Vínculo privado recuperado por cadeia completa e inequívoca da Logística.'});return r;
}
export function status(id){authorize();const p=read().storageTransfers?.[id];return p?{phase:p.phase,publicPlan:copy(p.publicPlan)}:null;}
export async function prepare(id){return serial(async()=>{
 authorize();await ensure();const s=read(),old=s.storageTransfers?.[id];if(old){if(old.phase==='cancelled')throw Error('A integração desta transferência foi cancelada.');return copy(old.publicPlan);}
 if(s.pending||storageBusy(s))throw Error('Conclua a operação pendente de Saques e Mercantes antes de iniciar outra transferência.');
 const t=transaction(id);if(t.estado!=='pendente'||t.integracaoSaques!==1||t.phase!=='intent')throw Error('Intenção de integração inválida.');
 const a=await A.actor(t.ator),user=game.users.get(t.usuario);if(!user||!owner(a,user))throw Error('Permissão do solicitante não confirmada.');
 let data,r=null,source=null;
 if(t.direcao==='depositar'){source=a.items.get(t.sourceId);if(!source)throw Error('Item da origem indisponível.');data=clean(source);if(!equal(data,clean(t.dados)))throw Error('A origem mudou antes da reserva. Cancele a intenção e tente novamente.');if(A.blocked(source))throw Error(A.blocked(source));if(s.identifications.some(r=>r.actorUuid===a.uuid&&r.itemId===source.id&&['pending','quoted'].includes(r.status)))throw Error('Conclua ou recuse a identificação pendente antes de depositar este item.');r=A.record(s,source)??await recoverLegacyRecord(s,source);}
 else if(t.direcao==='retirar'){const e=slot(t);if(!e||!equal(clean(e.dados),clean(t.dados)))throw Error('O depósito mudou antes da reserva.');data=clean(e.dados);const candidate=s.records[data.flags?.[ID]?.record];r=sameLocation(candidate,t)?candidate:await recoverLegacyRecord(s,null,{entry:e,t});}
 else throw Error('Direção de integração inválida.');
 if(data.flags?.[ID]?.record&&!r)throw Error('O vínculo privado deste item não pôde ser confirmado. Não houve movimentação; confira registros antigos com o Mestre.');
 const before=count(data),n=integer(t.quantidade,1,before),left=before-n;
 if(r?.unknown&&count(r.data)!==before)throw Error('A quantidade do item desconhecido diverge do registro privado. Confira antes de mover.');
 const result=fragment(s,r,data,n,t.direcao==='retirar'?a.uuid:null),publicPlan={version:1,data:result.data,sourceAfter:remainingData(r,data,left),removeSource:t.direcao==='depositar'&&left===0,destinationId:t.direcao==='retirar'?(result.id??uid()):null};
 const changes=[];if(r){changes.push({id:r.id,record:recordRemaining(r,data,left)});const next=result.record;if(t.direcao==='depositar'){next.actorUuid=null;next.itemId=null;next.location=location(t,t.id);}changes.push({id:next.id,record:next});}
 if(t.direcao==='retirar'){publicPlan.data.flags??={};publicPlan.data.flags[LOG]={...publicPlan.data.flags[LOG],transferencia:id};publicPlan.data.flags[ID]={...publicPlan.data.flags[ID],lock:id};}
 const plan={id,phase:'prepared',publicPlan,sourceBefore:clean(data),changes,locks:t.direcao==='depositar'?[{actorUuid:a.uuid,itemId:t.sourceId}]:[{actorUuid:a.uuid,itemId:publicPlan.destinationId}]};
 s.storageTransfers??={};s.storageTransfers[id]=plan;await save(s);
 if(source)await source.update({['flags.'+ID+'.lock']:id},{saquesStorageTransaction:id});notify();return copy(publicPlan);
 });}
async function validateCompleted(t,p){
 const a=await A.actor(t.ator),q=integer(t.quantidade,1),before=count(p.sourceBefore),left=before-q;
 if(t.direcao==='depositar'){
  const source=a.items.get(t.sourceId);if(p.publicPlan.removeSource||p.sourceBefore.type!=='equipamento'){if(source)throw Error('A origem ainda existe; transferência não confirmada.');}else if(!source||!equal(clean(source),p.publicPlan.sourceAfter))throw Error('O débito da origem não corresponde à intenção.');
  const e=slot(t,t.id);if(!e||!equal(clean(e.dados),clean(p.publicPlan.data)))throw Error('Crédito do depósito não confirmado.');
 }else{
  const e=slot(t);if(left?(!e||!equal(clean(e.dados),p.publicPlan.sourceAfter)):!!e)throw Error('O débito do depósito não corresponde à intenção.');
  const dest=a.items.get(p.publicPlan.destinationId);if(!dest||dest.flags?.[LOG]?.transferencia!==t.id||!equal(clean(dest),clean(p.publicPlan.data)))throw Error('O item de destino não corresponde à transferência.');
 }
}
export async function finish(id){return serial(async()=>{
 authorize();let s=read(),p=s.storageTransfers?.[id];if(!p)throw Error('Reserva privada não encontrada.');if(p.phase==='done')return;if(p.phase==='cancelled')throw Error('Reserva cancelada.');const t=transaction(id);
 if(p.phase==='prepared'){await validateCompleted(t,p);for(const c of p.changes){if(c.record)s.records[c.id]=copy(c.record);else delete s.records[c.id];}p.phase='committed';await save(s);}
 s=read();p=s.storageTransfers[id];await unlock(p);s=read();close(s,s.storageTransfers[id],'done');await save(s);notify();
 });}
export function canCancel(id){authorize();const p=read().storageTransfers?.[id];if(p&&['committed','done'].includes(p.phase))throw Error('A integração já confirmou a transferência. Conclua a conferência em vez de cancelar.');}
export async function cancel(id){return serial(async()=>{
 authorize();let s=read(),p=s.storageTransfers?.[id];if(!p||p.phase==='cancelled')return;canCancel(id);const t=transaction(id),a=await A.actor(t.ator);
 if(t.direcao==='depositar'){const i=a.items.get(t.sourceId);if(!i||!equal(clean(i),p.sourceBefore)||slot(t,t.id))throw Error('Restaure a origem e retire o crédito pendente antes de cancelar.');}
 else if(!equal(clean(slot(t)?.dados),p.sourceBefore)||a.items.get(p.publicPlan.destinationId))throw Error('Restaure o depósito e confira a ausência de destino antes de cancelar.');
 await unlock(p);s=read();close(s,s.storageTransfers[id],'cancelled');await save(s);notify();
 });}
export const logisticaBridge=Object.freeze({version:1,prepare,status,finish,canCancel,cancel});
