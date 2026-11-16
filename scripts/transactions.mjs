import {installedReason} from './instalados.mjs';
import {ID,uid,copy,equal,flag,ref,activeGM,esc} from './core.mjs';
import {read,save} from './db.mjs';
import {actor,clean} from './adapter.mjs';
export async function start(after,{steps=[],name,key}){if(!activeGM())throw Error('Somente o Mestre ativo executa a transferência.');const current=read();if(current.pending)throw Error('Confira a operação pendente.');for(const st of steps){const a=st.actorUuid?await actor(st.actorUuid):null,i=a?.items.get(st.id);const reason=st.kind==='create'?installedReason(st.data):i?installedReason(i):'';if(reason)throw Error(reason);}const id=uid();steps=steps.map(step=>({...copy(step),id:step.id??uid()}));await save({...current,pending:{id,name,key,steps,after:copy(after),phase:'applying'}});return resume();}
export async function resume(){if(!activeGM())throw Error('Somente o Mestre ativo pode retomar.');let s=read(),tx=s.pending;if(!tx)return;
 if(tx.phase==='applying'){
  for(const st of tx.steps){if(!activeGM())throw Error('O Mestre ativo mudou. Retome no novo Mestre.');
   if(st.kind==='token'){
    const scene=await ref(st.sceneUuid);const old=scene.tokens.get(st.id);if(old){if(flag(old,'transaction')!==tx.id)throw Error('ID de token ocupado por outro documento.');}else await scene.createEmbeddedDocuments('Token',[{...st.data,_id:st.id,flags:{...st.data.flags,[ID]:{...st.data.flags?.[ID],transaction:tx.id}}}],{keepId:true,saquesTransaction:tx.id});continue;
   }
   const a=await actor(st.actorUuid),i=a.items.get(st.id);
   if(st.kind==='create'){
    if(i){if(flag(i,'transaction')!==tx.id)throw Error('ID de item ocupado por outro documento.');}
    else await a.createEmbeddedDocuments('Item',[{...copy(st.data),_id:st.id,flags:{...st.data.flags,[ID]:{...st.data.flags?.[ID],transaction:tx.id,provisional:true}}}],{keepId:true,saquesTransaction:tx.id});
   }else if(st.kind==='delete'){
    if(!i)continue;const reason=installedReason(i);if(reason)throw Error(reason);if(!equal(clean(i),st.before))throw Error('A origem mudou; confira '+i.name+' antes de retomar.');await a.deleteEmbeddedDocuments('Item',[i.id],{saquesTransaction:tx.id});
   }else if(st.kind==='update'){
    if(!i)throw Error('A origem foi removida. Confira a operação.');const data=clean(i);if(equal(data,st.after))continue;const reason=installedReason(i);if(reason)throw Error(reason);if(!equal(data,st.before))throw Error('O item mudou durante a transferência: '+i.name);
    await a.updateEmbeddedDocuments('Item',[{_id:i.id,system:copy(st.after.system),flags:copy(st.after.flags),name:st.after.name,img:st.after.img}],{saquesTransaction:tx.id});
   }else throw Error('Etapa de transação inválida.');
  }
  const after=copy(tx.after);after.pending={...tx,phase:'committed',after:null};await save(after);s=read();tx=s.pending;
 }
 if(tx.phase==='committed'){
  for(const st of tx.steps.filter(st=>st.kind==='create')){const a=await actor(st.actorUuid),i=a.items.get(st.id);if(!i||flag(i,'transaction')!==tx.id)throw Error('Produto entregue indisponível; confira antes de liberar.');if(flag(i,'provisional'))await i.update({['flags.'+ID+'.provisional']:false},{saquesTransaction:tx.id});}
  const after=read();after.pending=null;await save(after);
 }
}
export async function cancel(){if(!activeGM())throw Error('Somente o Mestre ativo pode cancelar.');const s=read(),t=s.pending;if(!t)return;if(t.phase!=='applying')throw Error('A operação já foi confirmada. Retome para liberar os itens.');for(const st of t.steps){if(st.kind==='token'){const scene=await ref(st.sceneUuid);if(scene.tokens.get(st.id))throw Error('Já existe um recipiente criado. Retome a operação.');continue;}const a=await actor(st.actorUuid),i=a.items.get(st.id);if(st.kind==='create'&&i)throw Error('Já existe um produto criado. Retome a operação.');if(st.kind!=='create'&&(!i||!equal(clean(i),st.before)))throw Error('A origem já mudou. Retome em vez de cancelar.');}s.pending=null;await save(s);}
export function protectItem(item,changes,options={}){if(flag(item,'lock')&&options.saquesStorageTransaction!==flag(item,'lock')){ui.notifications.warn('Item reservado para conferência na Logística.');return false;}if(flag(item,'provisional')&&options.saquesTransaction!==flag(item,'transaction')){ui.notifications.warn('Entrega pendente de conferência pelo Mestre.');return false;}}
export function protectAttack(a,item){if(flag(item,'provisional')||flag(item,'lock')){ui.notifications.warn('Conclua a entrega antes de usar este item.');return false;}}
