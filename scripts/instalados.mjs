/** Contrato de transferência de equipamentos vinculados; funciona com expansões desativadas. */
const TLOU='sangue-escuro-the-last-of-us',DS='sangue-escuro-dead-space';
const list=c=>c?.contents??Array.from(c?.values?.()??c??[]);
export function installedReason(item,inventory=item?.parent?.items){
 const t=item?.flags?.[TLOU]??{},ds=item?.flags?.[DS]??{},id=item?.id??item?._id,uuid=item?.uuid;
 if(ds.instalado)return 'Remova o módulo pelo controle Instalar / remover de Dead Space antes de transferir.';
 if(t.instaladaEm||t.filtro||t.tipo==='mascara'&&t.equipada)return 'Retire a máscara de uso e libere o vínculo máscara/filtro pelos controles de TLOU antes de transferir.';
 if(list(inventory).some(other=>other!==item&&uuid&&(other.flags?.[TLOU]?.instaladaEm===uuid||other.flags?.[TLOU]?.filtro===uuid)))return 'Há um vínculo máscara/filtro de TLOU apontando para este item. Resolva-o nos controles da expansão antes de transferir.';
 if(t.arma||list(inventory).some(other=>other!==item&&id&&other.flags?.[TLOU]?.arma===id))return 'Retire o acessório vinculado pelo controle de TLOU antes de transferir.';
 return '';
}
