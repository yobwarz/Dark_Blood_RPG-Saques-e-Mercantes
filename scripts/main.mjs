import {logisticaBridge} from './logistica.mjs';
import {bindImageFields} from './images.mjs';
import {renderWallet,refreshWallets,closeWallet} from './sheets.mjs';
import {ID,all,activeGM,safe,serial,flag,owner} from './core.mjs';
import {read,ensure} from './db.mjs';
import {publish} from './projection.mjs';
import {command,process,response,boot} from './service.mjs';
import {open,refresh,OpenMenu,configureToken,chatCard} from './ui.mjs';
import {defeated} from './adapter.mjs';
import {protectItem,protectAttack} from './transactions.mjs';
let scheduled=false;export function schedule(){if(!activeGM()||scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;serial(async()=>{await publish();await textures();}).catch(e=>{console.error(ID,e);});},150);}
async function textures(){const s=read();for(const e of s.entities){if(!e.tokenUuid||!e.closed&&!e.opened)continue;const t=await fromUuid(e.tokenUuid);if(!t)continue;const empty=e.virtual?!e.items.some(r=>r.qty>0)&&!(s.wallets['entity:'+e.id]>0):!all(t.actor?.items).some(i=>['arma','protecao','equipamento'].includes(i.type));const src=e.openState||empty?e.opened:e.closed;if(src&&t.texture.src!==src)await t.update({'texture.src':src});}}
Hooks.once('init',()=>{if(game.system.id!=='sangue-escuro')return;
 for(const [key,type,def] of [['database',String,''],['views',Object,{}]])game.settings.register(ID,key,{scope:'world',config:false,type,default:def});
 for(const [key,name,def] of [['autoCombat','Abrir distribuição ao encerrar combate',true],['autoDeath','Liberar saque após derrota confirmada',false],['requireDefeat','Exigir derrota confirmada para saque',true],['announce','Registrar transações no chat',true],['automaticRolls','Resolver disputas d100 automaticamente',true]])game.settings.register(ID,key,{name,scope:'world',config:true,type:Boolean,default:def,onChange:schedule});
 game.settings.register(ID,'proximity',{name:'Alcance de saque e comércio (quadrados)',scope:'world',config:true,type:Number,default:1.5,range:{min:0.5,max:20,step:0.5},onChange:schedule});
 game.settings.register(ID,'showSheetWallet',{name:'Mostrar carteira na ficha do personagem',hint:'Exibe a moeda escolhida junto aos PE na aba Habilidades, nas fichas Clássica e Alternativa 1.',scope:'world',config:true,type:Boolean,default:true,onChange:refreshWallets});
 game.settings.registerMenu(ID,'panel',{name:'Saques e Mercantes',label:'Abrir painel',icon:'fas fa-coins',type:OpenMenu,restricted:false});
 game.modules.get(ID).api={open,configureToken,command,sync:schedule,logistica:logisticaBridge};
});
Hooks.on('getSceneControlButtons',config=>{if(game.system.id!=='sangue-escuro')return;const groups=Array.isArray(config)?config:Object.values(config??{}),g=groups.find(g=>['token','tokens'].includes(g.name))??groups[0];if(!g?.tools)return;const t={name:'saquesMercantes',title:'Saques e Mercantes',icon:'fas fa-coins',button:true,visible:true,onChange:()=>open()};if(Array.isArray(g.tools)){if(!g.tools.some(x=>x.name===t.name))g.tools.push(t);}else g.tools[t.name]={...t,order:Object.keys(g.tools).length};});
Hooks.once('ready',async()=>{if(game.system.id!=='sangue-escuro')return;
 await safe(boot)();Hooks.on('saquesMercantes.refresh',()=>{refresh();refreshWallets();});Hooks.on('saquesMercantes.changed',()=>{refresh();refreshWallets();notifyIdentification();});
 for(const h of ['updateActor','createItem','updateItem','deleteItem','updateToken','createToken','deleteToken'])Hooks.on(h,schedule);
 Hooks.on('updateJournalEntryPage',p=>{if(p.parent?.getFlag(ID,'database')||p.parent?.getFlag(ID,'viewFor')===game.user.id){refresh();refreshWallets();autoOpen();}});
 Hooks.on('createJournalEntry',()=>{refresh();refreshWallets();autoOpen();});
 for(const h of ['renderCharacterSheet','renderAlternativeCharacterSheet'])Hooks.on(h,renderWallet);for(const h of ['closeCharacterSheet','closeAlternativeCharacterSheet'])Hooks.on(h,closeWallet);Hooks.on('renderDialogV2',(app,html)=>bindImageFields(html?.querySelectorAll?html:html?.[0]??app.element));
 Hooks.on('createChatMessage',(m,o,u)=>safe(()=>process(m,u))());Hooks.on('updateChatMessage',response);Hooks.on('renderChatMessageHTML',chatCard);
 Hooks.on('preUpdateItem',protectItem);Hooks.on('preDeleteItem',(i,o)=>protectItem(i,{},o));Hooks.on('sangueEscuro.preAtaque',protectAttack);
 for(const h of ['updateUser','createUser','deleteUser'])Hooks.on(h,()=>safe(boot)());
 Hooks.on('renderTokenHUD',(hud,html)=>{if(!game.user.isGM)return;const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('.sem-hud-config'))return;const b=document.createElement('div');b.className='control-icon sem-hud-config';b.title='Saques e Mercantes: configurar';b.innerHTML='<i class="fas fa-sack-dollar"></i>';b.addEventListener('click',safe(()=>configureToken(hud.object.document)));(root.querySelector('.col.right')??root).append(b);});
 const TokenClass=CONFIG.Token.objectClass,original=TokenClass.prototype._onClickLeft2;
 TokenClass.prototype._onClickLeft2=async function(event){const data=game.user.isGM?read():null;const id=data?.entities.find(e=>e.tokenUuid===this.document.uuid||!e.tokenUuid&&e.actorUuid===this.actor?.uuid)?.id??this.document.getFlag(ID,'entity');const current=game.user.isGM?null:(await import('./db.mjs')).userView();const e=id?{id}:current?.entities.find(e=>e.id===flag(this.document,'entity')||e.tokenUuid===this.document.uuid||!e.tokenUuid&&e.actorUuid===this.actor?.uuid);if(!e)return original.call(this,event);open({entityId:e.id});return;};
 Hooks.on('dropCanvasData',(canvas,data)=>{if(!game.user.isGM||data.type!=='Item'||!data.uuid)return;safe(()=>command('quick',{uuid:data.uuid,sceneUuid:canvas.scene.uuid,x:data.x,y:data.y}))();return false;});
 Hooks.on('deleteCombat',safe(async combat=>{if(!activeGM()||!game.settings.get(ID,'autoCombat'))return;const sources=[],participants=[];for(const c of all(combat.combatants)){const a=c.actor;if(!a)continue;if(a.type==='character'&&a.hasPlayerOwner)participants.push(a.uuid);else if(!a.hasPlayerOwner&&(c.defeated||defeated(a,c.token)))sources.push({actorUuid:a.uuid,tokenUuid:c.token?.uuid,name:c.name,selected:true});}if(!sources.length)return;const result=await command('draft',{name:'Espólios do combate',sources,participants});open({sessionId:result.sessionId});}));
 const auto=safe(async doc=>{if(!activeGM()||!game.settings.get(ID,'autoDeath'))return;const token=doc.documentName==='Combatant'?doc.token:doc.documentName==='Token'?doc:null,a=token?.actor??doc.actor??doc;if(a?.documentName!=='Actor'||a.hasPlayerOwner||!(doc.defeated||defeated(a,token)))return;const old=read().entities.find(e=>e.tokenUuid===token?.uuid||!token&&e.actorUuid===a.uuid);await command('entityEdit',{entity:{...old,mode:old?.mode??'container',name:token?.name??a.name,actorUuid:a.uuid,tokenUuid:token?.uuid??old?.tokenUuid,released:true,enabled:true}});});Hooks.on('updateCombatant',auto);Hooks.on('updateActor',auto);
});
const opened=new Map();async function autoOpen(){if(game.user.isGM)return;const {userView}=await import('./db.mjs');for(const x of userView().sessions??[]){if(['open','resolving'].includes(x.status)&&opened.get(x.id)!==x.epoch){opened.set(x.id,x.epoch);open({sessionId:x.id});}}}

const identificationSeen=new Set();function notifyIdentification(){if(!game.user.isGM)return;for(const r of read().identifications.filter(r=>r.status==='pending'))if(!identificationSeen.has(r.id)){identificationSeen.add(r.id);open({home:true});ui.notifications.info('Nova solicitação de identificação. Confira a referência privada no painel.');}}
