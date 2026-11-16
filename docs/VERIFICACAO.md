# Verificação — Saques e Mercantes 0.2.3

Ambiente: Node.js, documentos e servidor Foundry simulados. Não equivale a uma sessão real nem certifica interoperabilidade com qualquer módulo externo.

64 cenários em `tests/integration.mjs`, `tests/runtime.mjs` e `tests/wallets.test.mjs`: conversão exata e arredondamento, falta de dinheiro, pilhas parciais, armas unitárias, flags e carregador nulo preservados, duas compras simultâneas, retomada após criação/consumo com resposta perdida, bloqueio por origem alterada, avaliação privada, recompra pelo mesmo preço e reservas entre tokens ligados, venda sem preço/saldo, anonimização/identificação paga, remoção de segredos na projeção, proximidade, 0 PV sem morte, vínculos Metro/TLOU, exclusão de habilidades/itens virtuais/naturais, deduplicação, lote editado parcialmente, empate e espera por todas as rerrolagens, pausa monetária, pilha no canvas, autoria e recibos, permissões, prontidão automática, disputa manual/cartão, tabela silenciosa/revisão textual, participante inválido, reabertura sem perda, renderização textual dos painéis.

Regressões selecionadas sem editar seus fontes: 22 verificações de compatibilidade/importador/API do núcleo, 19 casos DRS e 27 cenários de Barras e Relógios. Todos passaram. A suite de renderização deste módulo confere HTML gerado e controles; não verifica layout em navegador.

## REA

Skill usada: https://github.com/morluto/rea/blob/main/.agents/skills/reverse-engineer-anything/SKILL.md

REA 6.9.0, operação `analyze_javascript_application`, seleção de `data.mjs`, `documents.mjs` e `api.mjs` extraídos do ZIP 0.8.6 efetivamente publicado. Foram analisados 3 dos 23 arquivos JavaScript inventariados, 59.544 bytes, 8.988 nós AST e 51 achados, sem falhas de parse. Os vinte arquivos não selecionados permanecem fora dessa análise. Um arquivo selecionado atingiu o limite semântico de 512 estados de alias; a cobertura semântica é parcial. Nenhum código do artefato foi executado pelo REA. Relações estáticas não provam execução ou compatibilidade multicliente.

Digest do artefato: `09c1d674849de0f6f0bd307b6805d3d4605953547fe950a919fbc426bd0a6806`.

Evidência: `ev_cd1ee2673aa0211775868978a1e8ae392bae7ef3729fdd12cc76b0c686328e80`.

Resumo: `ev_fec03edceb35f0a4cf4679d19f09504bb229c0d113eac1050f7dca5dd9b60b90`.

A conferência manual dos contratos e os testes simulados fundamentam a adaptação. A entrega inicial 0.1.0 preservou o núcleo 0.8.6. A correção 0.1.1 acompanha o sistema 0.8.7, que altera apenas a decoração dos compêndios, versão, documentação e teste correspondente; as regras e os pacotes das expansões permanecem preservados.

## Limites operacionais

As operações próprias são serializadas pelo Mestre ativo. Não há promessa de transação atômica com ferramentas de terceiros que gravem os mesmos documentos em paralelo. Falhas exigem conferência persistida; não existe rollback cego ou recriação automática de itens removidos manualmente. Proximidade usa coordenadas/tamanho dos tokens e referência de quadrados, não visão de linha, paredes ou pathfinding. Interação em cenas sem grade usa a escala de grade configurada. Identidades desconhecidas pertencem a este módulo; não são um novo campo mecânico global do sistema.

## Regressões do log recebido

Antes da correção, os testes reproduziram os dois erros do log: escopo Metro inativo em getFlag e variável node sombreada na decoração do diretório. A simulação de documentos agora rejeita escopos externos desativados, como o Foundry. Após corrigir, passaram 37 testes do módulo, incluindo importação e projeção sem Metro, preservação de bloqueio por operação persistida, aviso de ator vazio, abertura pelo menu nativo e formulário do HUD do token.

O teste de compêndios do sistema executa ambos os ganchos de renderização com entradas de diretório e nós de texto, preservando SCRIPT/STYLE e metadados, e aceita elemento nativo ou wrapper de biblioteca. Compatibilidade e fichas alternativas também passaram. Continuam sendo testes simulados, sem Foundry real neste ambiente.

## Moedas e imagens — 0.2.0

56 testes simulados passaram. Os 19 casos adicionais cobrem moeda principal/individual, conversão visual com ícone, atualização de quantidade, saldo vazio/zero, restos exatos, exclusão sem perda, dados antigos sem preferências, permissões, projeção privada, injeção única da carteira junto aos PE, atualização sem renderização integral e liga/desliga, limites de 300 KB/1 MB, MIME/formato, tamanho informado e tamanho real do corpo, validação anterior ao upload, FilePicker nativo e prévia, preenchimento do editor e revalidação pelo Mestre.

A integração usa ganchos de renderização das fichas, sem alterar arquivos do sistema 0.8.7 ou das expansões. As imagens usam APIs namespaced de FilePicker do Foundry 13. A simulação de DOM e FilePicker não equivale a teste de clique/upload ou sessão multicliente no Foundry real.

## Ajuste visual — 0.2.1

Funcionamento das moedas da 0.2.0 confirmado pelo usuário em Foundry. A revisão visual da 0.2.1 mantém 56 testes simulados; a carteira na ficha exige texto simples, sem img/svg, total convertido, rodapé ou botão adicional. Os ícones continuam nos cartões do módulo. A revisão de cartões, tipografia e lista de moedas não altera handlers financeiros. Sem captura ou teste visual desta revisão em um Foundry real neste ambiente.

## Campo de consulta — 0.2.2

Carteira passa a label/input readonly, herdando o estilo dos PE, sem botão, listener de clique ou data-sem-wallet-open. Campo sem name evita sua inclusão no salvamento nativo do ator. As verificações existentes cobrem readonly, ausência de botão/ação/nome de formulário e atualização do value, mantendo os 56 cenários simulados aprovados. O usuário confirmou que as cores da 0.8.8 foram resolvidas. A revisão visual da caixa ainda não foi executada em Foundry real neste ambiente.

## Regressão Editar lote — 0.2.3

O log recebido aponta para integer(d.qty,0,row.qty) em rowEdit. A captura mostra quantidade 1 e preço 10, mas o payload efetivamente recebido não foi inspecionado no navegador do usuário. O ajuste lê explicitamente os campos DOM, preserva quantidade quando ausente/vazia e fornece mensagens de campo/limite. Não se atribui uma causa de conversão específica ao Foundry sem evidência desse payload.

Problemas adicionais reproduzidos no código: o max do formulário usava a quantidade já reduzida; a projeção de lote zero chamava part(...,0), que rejeitava zero. A nova projeção preserva maxQty original, limita a edição à origem atual e permite visualizar/restaurar zero.

Oito regressões novas, total de 64 testes simulados aprovados. Incluem fluxo de confirmação do diálogo para arma 1/preço 10 e verificação de que a origem não é consumida na edição. Quantidade maior que a origem ou fracionária continua rejeitada, agora com mensagem específica. Sem teste desta revisão em Foundry real neste ambiente.

## Integração de depósito e identificação — Saques 0.2.4 / Logística 0.3.1

Atualize **os dois módulos juntos**, com backup e o Foundry fechado. O sistema continua em 0.8.8. Ao usar apenas Expedições e Abrigos, os itens comuns continuam funcionando sem instalar Saques e Mercantes. Um item com registro privado exige Saques ativo e a integração atual para ser movimentado.

Itens desconhecidos mantêm sua identidade verdadeira no Diário privado do Mestre ao serem depositados ou retirados, inclusive por outro personagem e em pilhas parciais. O depósito recebe somente a aparência anônima e uma referência opaca; nome, descrição e dados verdadeiros não são gravados nas configurações da Logística. Avaliações, munição e durabilidade de itens conhecidos também são preservadas. Conclua ou recuse identificações pendentes antes de depositar.

A intenção, o débito, o crédito e a confirmação privada são conferidos separadamente. Uma interrupção bloqueia novas movimentações e as operações de Saques até o Mestre usar **Conferir transferência pendente** na Logística. O painel de Saques oferece **Conferir na Logística** quando essa for a origem da pendência. Concluir confirma os efeitos já comprovados; cancelar exige ausência de item criado e restaura o estoque quando aplicável. Não repita a transferência nem copie manualmente o item para contornar a pendência. O novo ID do destino é reservado antes de criar o documento.

Transferências completas feitas pelas versões anteriores podem recuperar o vínculo quando o histórico comprova inequivocamente depósito, retirada e origem. Cópias múltiplas ou pilhas antigas já divididas não são adotadas por aproximação: o módulo interrompe a movimentação para revisão do Mestre. Não apague o registro privado nem o histórico antes dessa revisão.

Contrato opcional entre módulos: `game.modules.get('sangue-escuro-saques-mercantes').api.logistica`, versão 1, oferece `prepare(id)`, `status(id)`, `finish(id)`, `canCancel(id)` e `cancel(id)`. Exige o Mestre ativo e uma intenção persistida pela Logística. Retorna apenas plano público ou recibo; o registro verdadeiro permanece privado e continua vinculado ao ator/item ou ao depósito exato. Não é uma API de inventário para macros de jogadores.

Verificação: 20 cenários de integração, 64 cenários funcionais existentes de Saques, cinco suítes da Logística e oito combinações de inicialização com cenários/API. Inclui pilhas, identificação, dados privados, referência copiada, interrupções antes/depois dos efeitos, confirmação privada e recuperação conservadora de legado. Testes simulados; não houve sessão em Foundry real ou multicliente nesta revisão. Esta etapa não altera as regras de instalações de TLOU/Dead Space nem as demais pendências da auditoria.

## Equipamentos instalados — Saques 0.2.5 / Logística 0.3.2

As duas ferramentas recusam movimentar filtros ligados a máscaras, máscaras com filtro vinculado ou em uso e acessórios de arma vinculados de TLOU. A verificação lê tanto a referência da peça quanto as referências de outras peças do inventário para ela. Módulos marcados como instalados de Dead Space também não podem ser transferidos. Os bloqueios funcionam mesmo com a expansão desativada, sem consultar namespaces opcionais por getFlag nem apagar flags persistidas.

Em TLOU, a ação nativa **Substituir filtro** libera o filtro anterior para transporte, conservando seu tempo restante. A máscara que continua ligada ao filtro novo permanece no personagem. Retirar a máscara de uso não desfaz sozinho a ligação do filtro. Em Dead Space, use **Instalar / remover** antes do transporte e respeite os dez minutos fora de combate, contabilizados pelo controle nativo. O módulo removido conserva as cargas; sua instalação no destino continua sujeita ao traje e aos demais requisitos nativos. Nenhuma instalação é feita automaticamente pela transferência.

No Saques, os bloqueios cobrem coleta, compra/venda, importação e composição/entrega de distribuições. Peças instaladas são omitidas do conjunto automático do encontro. Estoques virtuais antigos com estado instalado são recusados na entrega. O vínculo é conferido novamente antes de persistir/aplicar o débito para detectar alterações feitas após a preparação. Na Logística, depósitos e retiradas verificam o estado antes de gravar uma nova intenção; itens comuns continuam transportáveis com o módulo isolado. Os dois auxiliares têm o mesmo contrato de bloqueio e não dependem de carregar o outro para verificá-lo.

A atualização não repara automaticamente UUIDs quebrados por transferências antigas, não desinstala equipamentos e não apaga estados para liberar um item. Peças antigas com vínculos órfãos ou estoques com estado instalado exigem conferência do Mestre na origem e no destino. A integração de identificação privada da versão anterior permanece preservada.

Atualize Saques e Mercantes e Expedições e Abrigos, com backup e Foundry fechado. Sistema 0.8.8, TLOU 0.1.3 e Dead Space 0.1.1 continuam nas mesmas versões. Foram aprovados 26 testes novos (14 no Saques e 12 cruzados), as 64 verificações funcionais anteriores de Saques, os 20 casos da identificação privada, cinco suítes de Logística, as suítes nativas de TLOU/Dead Space e oito perfis de inicialização. Testes simulados; sem Foundry real ou sessão multicliente nesta revisão.
