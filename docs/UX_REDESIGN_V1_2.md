# BuyCar Lab - BR — redesign visual da v1.2.0

> Estado: revisão aprovada e integrada à release oficial v1.2.0.
>
> Aplicação: versão 1.2.0 na branch `main`.
>
> Referência funcional anterior: v1.1.0, commit 63e48ad.
>
> Atualizado em: 2026-10-12.

## Direção aprovada

Esta rodada usa o relatório “BuyCar Lab – Relatório de UX e plano de redesign” e as oito imagens claras/escuras do “Redesign v2” fornecidas pelo usuário. Os dados e nomes pessoais dos mockups são ilustrativos. A implementação usa os veículos, TCO e financiamentos reais do estado local.

A identidade azul permanece. Violeta identifica o veículo atual e seu nome como referência. Verde indica economia e destaques de menor custo operacional. Os cards de decisão do Ciladômetro usam superfície neutra: exclusivamente o vencedor único pelo menor impacto acumulado recebe borda e selo dourados. Empate ou comparação incompleta não recebem vencedor arbitrário. O dourado qualifica esse critério financeiro, sem significar melhor carro ou economia líquida. Vermelho identifica custo adicional e erros. Texto e sinais acompanham a cor.

## Proporções e leitura

- Cabeçalhos alinhados, título menor e faixa inicial compacta nas quatro áreas. A repetição de “Área atual” foi removida do header.
- “Minha garagem” é o título provisório até existir usuário autenticado; “Qual custa menos?” substitui o texto artificial da Comparação; “Simular financiamento” substitui o título Laboratório.
- Cards de opções em quatro colunas quando a largura permite, com adaptação para menos colunas.
- Métricas do Resultado operacional em quatro posições equivalentes; duas por linha em larguras menores. O antigo fechamento duplicado foi removido.
- Números e contexto próximos, com dígitos tabulares e sem quebra arbitrária no meio de um valor monetário.
- TCO detalhado compacto, valores alinhados à direita e significado da diferença na mesma célula.
- Todas as linhas de TCO são preservadas, incluindo depreciação. Em telas estreitas, a tabela tem scroll próprio.
- A tabela de amortização mantém os números centralizados, suas nove colunas, filtros e CSV.
- A tipografia usa a família de sistema disponível localmente; não exige download de fonte. A única nova dependência da consolidação é `lucide-react`.

## Seleção compacta

Comparação e Ciladômetro mostram até quatro veículos em uma faixa horizontal compacta, com ordem fixa para impedir deslocamento ao selecionar. Até quatro cadastrados, todos aparecem nos cartões. Com cinco ou mais, três cartões de veículos ficam visíveis e o quarto mostra “+N”, abrindo as opções restantes por um disclosure acessível por teclado. O painel permanece ao lado do título em desktop e passa a duas colunas no mobile. O limite máximo é informado no subtítulo, sem contador redundante. Financiamento usa a mesma família visual, com indicador quadrado e semântica radio preservada.

O limite aprovado nesta rodada é de quatro opções; permanece a exigência de pelo menos uma seleção. Uma tentativa de marcar a quinta mantém as quatro atuais e apresenta erro. A primeira seleção de Comparação continua persistida; as demais continuam locais à tela. Financiamento usa o mesmo seletor com escolha única, mantendo um veículo por vez. A base publicada v1.1.0 continua com limite de duas opções.

## Semântica dos destaques

| Área | Métrica do destaque | Conjunto comparado |
| --- | --- | --- |
| Veículos | Mais econômico | Menor TCO de caixa mensal entre as opções cadastradas |
| Comparação | Menor TCO de caixa / maior economia operacional | Veículo atual e opções selecionadas |
| Financiamento | Menor total de juros | Três cenários já calculados do mesmo contrato |
| Ciladômetro | Menor impacto total no bolso | Resultados existentes das opções financiadas selecionadas, no horizonte comum |

O helper de apresentação `application/resultHighlights.ts` identifica um mínimo único a partir dos números já calculados, com tolerância monetária de R$ 0,005. Empates não recebem selo de vencedor único. Ele não altera TCO, juros, pagamentos ou recomendação do Ciladômetro.

Se a referência for a mais barata na Comparação, uma opção não recebe selo de menor TCO. Com financiamento ausente, não se declara vencedor de impacto total. “Menor total de juros” não é rotulado como melhor opção global: juros, liquidez e impacto total são critérios distintos.

## Ciladômetro

O nome do veículo atual aparece em contexto compacto e violeta. Decisão financeira identifica a opção, estratégia de amortização, empates e vencedor, sem duplicar os painéis numéricos das seções seguintes. Custo de uso explica quanto custa manter cada carro e a economia operacional; após quitação, a relação com a economia líquida é explicada sem repetir o mesmo número. A prestação integral, aporte aplicado, cobranças, pagamento financeiro e impacto líquido pertencem à composição do primeiro período. Média, maior/menor impacto e acumulado pertencem ao horizonte, junto de prazo original, efetivo, total desembolsado e juros.

Em empate, o texto principal é “Empate técnico”, acompanhado da quantidade de estratégias. “Ver estratégias empatadas” lista todos os nomes, sem criar um desempate. As métricas singulares continuam usando o cenário representativo que a camada de aplicação já fornece.

A composição do primeiro período preserva:

```text
prestação contratual + aporte aplicado + cobranças
− economia operacional = impacto no bolso
```

O sinal incorreto de cobranças no texto conceitual do relatório não é reproduzido. Os cálculos existentes permanecem a fonte da apresentação.

O painel de horizonte continua incluindo períodos após a quitação. Seu título e descrição deixam explícito que o horizonte não se limita ao prazo efetivo ativo do financiamento.

## Financiamento

Compra e contrato continuam agrupados à esquerda, com resultado salvo à direita. O resumo informa a origem do valor financiado. O texto junto ao botão deixa claro que salvar atualiza resultados; não promete recálculo ao vivo de rascunhos não salvos.

Plano recorrente, aportes únicos, exceções e cobranças mantêm seus campos editáveis. Cobranças são organizadas dentro do painel sem vazamento para a coluna de resumo. Estratégias preservam todas as métricas. Gráficos usam o schedule existente e cores tematizadas.

## Escopo futuro

O header possui o espaço visual de conta “Entrar / Sua conta”, com ícone genérico e mensagem explícita de indisponibilidade do login. Autenticação, foto/nome reais, múltiplas garagens, compartilhamento e dados por usuário pertencem à etapa de backend/Supabase ainda planejada. Esta rodada não cria identidade fictícia, autenticação ou novo schema de persistência.

## Governança e validação

`FINANCIAL_MODEL.md` permanece vigente, sem alteração financeira. `APPLICATION_GUIDE.md` preserva a auditoria da base v1.1.0 e registra a v1.2.0 em adendo separado. `PRODUCT_SPEC.md` registra o escopo aprovado da release e aponta para este documento como histórico do redesign. Os registros de validação abaixo incluem etapas anteriores ao aumento da versão, quando o RC ainda usava `1.1.0` no pacote.

## Consolidação de iconografia e componentes

`styles/tokens.css` centraliza a paleta dos dois temas e os tokens de tipografia, espaço, bordas e interação. `app.css` mantém a composição existente e os estilos compartilhados. `AppIcon` usa imports individuais, `strokeWidth=1.75`, tamanhos 24 px na navegação, 20 px em cards/campos e 16 px em tabelas/ações compactas. Os nomes solicitados são suportados por Lucide 1.55.0, inclusive `ChartPie`; não foi necessária substituição.

`SectionHeader`, `CheckboxOption` e `PowertrainBadge` consolidam padrões repetidos. Sidebar usa CarFront, GitCompareArrows, Landmark e Gauge em containers de 36 px. O tema usa Sun/Moon no rodapé, separado da limpeza de dados. Conta mantém disclosure informativo funcional com UserRound/ChevronDown, sem autenticação fictícia. Ações, motorizações, componentes TCO, campos financeiros, planos, estratégias, gráficos e CSV usam ícones decorativos com textos preservados.

Esta consolidação não modifica nenhum arquivo de domínio, aplicação, modelos de formulário, parsing ou formatação monetária; alterações existentes dessas camadas no working tree são preservadas. Cobranças continuam com sinal positivo na composição do primeiro período.

Antes de aprovação: suíte completa, build, diff check e inspeção em claro/escuro, desktop/tablet/mobile; uma e duas opções; empates; ausência de financiamento; seleção por teclado; reload e CSV. Nenhum commit, push ou bump da aplicação faz parte desta rodada.

Validação da primeira rodada Redesign v2 em 2026-10-12 (anterior à ampliação do seletor):

- 302 testes existentes preservados; seis casos adicionais de destaque único/empate; 308 testes aprovados.
- Build de produção aprovado e `git diff --check` sem erros.
- Navegador Edge headless em perfil isolado: quatro telas, dois temas e larguras de 1440, 1280, 1024, 816, 500 e 390 px; 48 estados inspecionados sem overflow global ou erro de execução.
- Cenários dirigidos de duas opções, limite de seleção, empate e opção sem financiamento aprovados.
- Seletor operável por teclado, tema preservado no reload, CSV anual com filtro, máscara monetária/vazio e rascunho sem mutação do registro persistido verificados.
- Impacto do hero e composição do primeiro período reconciliados usando o mesmo resultado existente.
- Fórmulas de domínio, schedule, CSV e schema de persistência não foram alterados nesta rodada.

Validação da revisão de cabeçalhos, seleção e Ciladômetro em 2026-10-12:

- 313 testes aprovados: 308 anteriores e cinco casos adicionais de seleção até quatro opções, limite, reconciliação, comparação independente e horizonte comum.
- Build de produção aprovado; versão do aplicativo mantida em 1.1.0.
- Edge headless em perfil isolado: as quatro telas abertas nos dois temas, em 1920, 1440, 1024, 816 e 390 px; 40 capturas, sem overflow global nem erro de execução.
- Quatro opções abertas na Comparação e no Ciladômetro em 1440, 816 e 390 px; quinta seleção recusada. Financiamento com escolha única e troca de veículo verificados.
- Primeira prestação do hero reconciliada com a composição do primeiro período; impacto do hero reconciliado com o fluxo real. Menu de conta acessível por teclado e dados do veículo atual preservados no reload.
- Revisão visual corrigiu métricas estreitas da Comparação e quebras de valores financeiros nos cards de decisão. Header e título das quatro áreas usam o mesmo alinhamento.

Validação da consolidação de iconografia e propriedade das métricas em 2026-10-12:

- 313 testes existentes aprovados; nenhum teste de domínio/aplicação foi alterado nesta rodada. Build de produção aprovado; apenas `lucide-react` 1.55.0 foi acrescentado à dependência e ao lockfile, mantendo a versão 1.1.0 e o lazy loading financeiro.
- 33 arquivos protegidos de domínio, aplicação, modelos de formulário, CurrencyInput e formatação comparados por SHA-256 antes/depois, sem diferenças. Isso preserva também as alterações anteriores dessas camadas no working tree.
- Edge headless em contextos isolados: 467 verificações e 96 capturas, cobrindo as quatro áreas e cadastro em 1440, 1024, 816, 500 e 390 px, nos dois temas; nenhum overflow global ou de valores verificados, nem falha de execução.
- Seleções de uma a quatro opções, quinto veículo disponível, bloqueio da quinta seleção e substituição de uma das quatro verificados sem criar dados no navegador real. Alternância repetida no financiamento preservou as coordenadas dos nomes e a seleção unitária.
- Primeira prestação e impacto líquido da composição reconciliados com os resultados existentes da aplicação para cada opção; topo sem duplicação desses destaques. Empate entre veículos e financiamento incompleto não produziram selo dourado de vencedor.
- ICE, HEV, PHEV e BEV, campos condicionais, cadastro/edição, erro de salvamento, km herdado/manual, IPVA automático/manual e preservação dos veículos/contratos após cancelar verificados. Inspeção corrigiu a regra antiga de navegação flex no mobile e a distribuição dos valores do primeiro período.
- Verificação dirigida adicional nos dois temas: licenciamento manual e retorno ao padrão, tema e menu de conta por teclado, gráficos após conclusão das animações e formulário financeiro mobile. O espaço excessivo do cabeçalho de planos no mobile foi eliminado sem alterar seus controles.
