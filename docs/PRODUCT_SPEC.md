# Especificação do produto — v1.x

> Documento: PRODUCT_SPEC
>
> Revisão do documento: 1.0.11
>
> Aplicação descrita: 1.4.0 (base auditada 1.1.0 + adendos v1.2 a v1.4)
>
> Commit base auditado: 63e48ad
>
> Data da auditoria: 2026-10-11
>
> Status: Vigente

## Adendo normativo — perfil e configurações da v1.4.0

- A conta autenticada pode cadastrar e trocar uma foto de perfil opcional, editar o nome, solicitar alteração do email e trocar a senha. O email alterado depende do fluxo de confirmação do Supabase; o aplicativo não deve apresentá-lo como confirmado antes disso.
- Durante o cadastro, a pessoa pode escolher uma foto. Como a confirmação de email precede a sessão autenticada, a foto fica temporariamente neste navegador e é enviada ao entrar na conta no mesmo navegador. Caso confirme em outro dispositivo, pode acrescentar a foto nas configurações.
- O menu da conta abre uma tela própria de configurações. O visitante também pode abri-la para entender e apagar seus dados locais. A ação de limpar dados sai da sidebar e fica na seção de dados dessa tela, com confirmação explícita. Apagar a garagem não exclui a conta.
- Fotos são privadas por conta, com limite de 2 MB e formatos JPG, PNG e WebP. Dados pessoais não entram em `vehicle_data`, TCO ou financiamento.
- A tela de configurações mostra os dados em modo de consulta. **Alterar dados** abre o formulário de nome, email, senha e foto. A foto escolhida é apenas uma prévia até **Salvar alterações**; antes de enviar qualquer alteração, um diálogo pede confirmação. **Cancelar** descarta o rascunho. A seção de dados da garagem permanece acessível nessa tela.

## Governança e autoridade

Este documento é a autoridade normativa para funcionalidades, comportamento esperado, jornadas, UX funcional, escopo atual e roadmap.

1. `FINANCIAL_MODEL.md` é a autoridade para fórmulas, conceitos e decisões financeiras.
2. `PRODUCT_SPEC.md` define o que o produto deve fazer.
3. `APPLICATION_GUIDE.md` descreve como a aplicação realmente funciona.
4. Código e testes são evidência da implementação atual.

Uma divergência deve ser classificada como documentação desatualizada, gap de implementação ou decisão aberta. Código divergente não revoga automaticamente uma regra normativa.

Este arquivo distingue **Implementado na v1.x**, **Regra normativa atual**, **Roadmap** e **Referência histórica da planilha**. A planilha é fonte histórica e de golden cases, sem definir automaticamente o produto atual.

## 1. Objetivo e proposta de valor

O BuyCar Lab - BR é um aplicativo pessoal, local e em português do Brasil para apoiar a decisão de manter ou trocar um veículo. O produto reúne, em um fluxo único, o cadastro dos veículos, a comparação de custo total de propriedade, a simulação do financiamento da opção escolhida e o Ciladômetro.

A v1.x deve responder com clareza:

- quanto cada veículo custa por mês, por ano e por quilômetro;
- quanto da diferença representa economia ou custo adicional;
- como a compra financiada afeta o caixa mensal;
- quanto aportes extraordinários alteram prestação, prazo, juros e saldo devedor.

A experiência não reproduz a estrutura de abas da planilha. Os dados são organizados pelas tarefas do usuário: **Veículos**, **Comparação**, **Financiamento** e **Ciladômetro**.

### 1.1 Fontes de contexto

1. `docs/FINANCIAL_MODEL.md` é a autoridade para fórmulas, conceitos financeiros, arredondamentos, limitações e golden cases.
2. O Simulador de amortização do Investidor Sardinha orienta funcionalidades da área de financiamento, como parâmetros contratuais, agenda de aportes e comparação entre reduzir prazo ou prestação.
3. A referência funcional não substitui as regras financeiras documentadas e sua interface visual não deve ser copiada.

Quando esta especificação e o modelo financeiro parecerem divergir, prevalece `FINANCIAL_MODEL.md`. Uma mudança de fórmula exige primeiro a atualização e validação do modelo financeiro.

## 2. Usuário e jornadas principais

### 2.1 Perfil

O usuário é o proprietário de um veículo que deseja avaliar uma possível troca com seus próprios dados. Ele conhece ou estima custos anuais, consumo, quilometragem e condições de financiamento. A v1.x atende uma pessoa em um único dispositivo, sem conta.

### 2.2 Jornadas

#### Primeiro uso

1. Cadastrar o veículo atual.
2. Informar custos, quilometragem e dados da motorização.
3. Cadastrar ao menos uma opção de troca.
4. Abrir a comparação entre o atual e uma ou duas opções.

#### Comparar uma troca

1. Selecionar uma ou duas opções salvas.
2. Conferir premissas e eventuais dados ausentes.
3. Comparar TCO de caixa e TCO econômico.
4. Ver economia ou custo adicional mensal, anual e por quilômetro.
5. Escolher uma opção para simular a compra.

#### Simular financiamento

1. Conferir preço, valor de troca, entrada e custos financiados.
2. Informar contrato PRICE, taxa efetiva, periodicidade, prazo e cobranças periódicas.
3. Calcular o cenário sem amortização extraordinária.
4. Criar aportes únicos ou recorrentes.
5. Comparar o cenário-base com `reducePayment` ou `reduceTerm`.
6. Consultar resumos, evolução do saldo e cronograma até a quitação.

## 3. Conceitos obrigatórios

As três visões financeiras devem permanecer separadas em todas as telas:

- **TCO de caixa:** custos operacionais efetivamente pagos no período, sem aquisição, entrada ou principal do financiamento.
- **TCO econômico:** na v1.x, TCO de caixa acrescido somente da depreciação anual.
- **Fluxo do financiamento:** prestações, principal, juros, cobranças periódicas e aportes.

Juros, CET, tarifas financeiras, principal, correção monetária e outros encargos financeiros não compõem o TCO econômico atual.

O pagamento de principal reduz caixa e passivo simultaneamente. Isoladamente, não é custo econômico e não reduz o patrimônio líquido.

A economia operacional mensal segue a orientação do modelo:

```text
TCO de caixa mensal do veículo atual
- TCO de caixa mensal da opção de troca
```

Valor positivo significa economia. Valor negativo significa custo operacional adicional.

Quando houver financiamento, o impacto mensal da troca deve ser mostrado separadamente:

```text
pagamento financeiro do período
+ TCO de caixa mensal da opção de troca
- TCO de caixa mensal do veículo atual
```

Valor positivo representa saída adicional de caixa; valor negativo representa economia de caixa.

## 4. Estrutura de navegação

A navegação principal tem quatro áreas em sequência lógica:

1. **Veículos**
2. **Comparação**
3. **Financiamento**
4. **Ciladômetro**

O usuário pode retornar às etapas anteriores sem perder dados. Comparação e Ciladômetro aceitam até duas opções contra o veículo atual. O Financiamento permanece unitário e reutiliza sua seleção persistida. Não há navegação baseada nas abas ou nos nomes `_EV` da planilha.

## 5. Área Veículos

### 5.1 Responsabilidades

- manter exatamente um veículo atual;
- cadastrar, editar, duplicar e excluir opções de troca;
- indicar claramente a motorização;
- mostrar se há dados suficientes para calcular TCO de caixa e econômico;
- permitir copiar a quilometragem do veículo atual ao cadastrar uma opção, persistindo apenas o número copiado;
- mostrar quilometragem anual, TCO de caixa mensal e valor de mercado nos cards.

A exclusão de uma opção exige confirmação, limpa referências inválidas e remove sua simulação de financiamento associada.

### 5.2 Campos comuns

| Grupo | Campos | Regras de produto |
| --- | --- | --- |
| Identificação | Nome do veículo, motorização `ICE`, `HEV`, `PHEV` ou `BEV` | Nome e motorização são obrigatórios. |
| Uso | Quilometragem anual | Deve ser maior que zero para resultados por km. |
| Valor | Valor de mercado, taxa anual de depreciação | Necessários para o TCO econômico pela regra simples vigente. |
| Propriedade | Seguro, IPVA, licenciamento e manutenção anuais | Valores não negativos, sempre identificados como anuais. |

Preço de compra, valor de troca, entrada adicional e custos financiados pertencem à configuração do Financiamento. Eles não são campos persistentes do veículo.

Na v1.x, a depreciação anual é `valor de mercado × taxa anual de depreciação`. Curvas de depreciação e valor residual por horizonte permanecem no roadmap. Essa regra define o único componente adicional do TCO econômico atual.

O IPVA usa como default editável 4% do valor do veículo para carro de passeio em SP. O licenciamento usa o default editável de R$ 174,08 para SP em 2026. Valores manuais e registros existentes são preservados. Entradas monetárias usam prefixo `R$`, ponto de milhar e vírgula decimal, mas persistem números.

### 5.3 Campos por motorização

#### ICE

- tipo ou descrição do combustível;
- consumo em km/L ou L/100 km;
- preço por litro.

#### HEV

Usa os mesmos campos de combustível do ICE, com a eficiência própria do híbrido. A energia recuperada internamente não será cadastrada como fonte comprada separada.

#### BEV

- consumo em kWh/100 km;
- tarifa efetiva em R$/kWh;
- perdas de recarga em percentual.

#### PHEV

- consumo elétrico, tarifa e perdas de recarga;
- consumo e preço do combustível líquido;
- divisão da quilometragem anual entre modo elétrico e combustão.

Os percentuais de uso elétrico e a combustão devem somar 100% da quilometragem anual. Modelos por dias, viagens ou energia medida ficam no roadmap. O custo de cada fonte é calculado separadamente para impedir dupla contagem.

### 5.4 Estados

- **Sem veículo atual:** explicar que ele é necessário como referência e oferecer a ação “Cadastrar veículo atual”.
- **Sem opções de troca:** oferecer “Adicionar opção”.
- **Cadastro incompleto ou valor inválido:** preservar os valores enquanto o formulário permanece aberto, exibir um alerta de validação visível e impedir o salvamento. A associação individual de mensagens aos campos e rascunhos persistidos não existem na v1.x e ficam no roadmap.

## 6. Área Comparação

### 6.1 Responsabilidades

A tela compara o veículo atual com uma ou duas opções selecionadas. Cada resultado mantém o veículo atual como referência; não existe fórmula principal de opção contra opção.

Deve apresentar lado a lado:

- premissas principais e motorização;
- custo de energia ou combustível;
- manutenção, seguro, IPVA e licenciamento;
- depreciação separada;
- TCO de caixa mensal, anual e por km;
- TCO econômico mensal, anual e por km;
- diferença absoluta e percentual;
- economia ou custo adicional de cada opção.

A v1.x usa uma visão anual normalizada do TCO. Os valores mensais derivam do total anual dividido por 12, e os valores por quilômetro usam o total anual dividido pela quilometragem anual declarada. Quilometragem inválida impede salvar o veículo. Análises por horizonte de posse permanecem no roadmap.

### 6.2 Leitura dos resultados

- Verde, ícones ou texto podem reforçar economia, mas a informação não pode depender somente de cor.
- A direção do cálculo deve aparecer junto ao resultado: “veículo atual menos opção de troca”.
- TCO de caixa e econômico nunca serão combinados em um único número.
- O custo de aquisição e o financiamento não alterarão os cartões de TCO.

### 6.3 Ações

- trocar as opções comparadas, respeitando o limite de duas.

Atalhos contextuais para editar veículos, selecionar uma opção para financiamento, retornar à garagem ou abrir um resumo de financiamento não existem na tela Comparação da v1.1.0 e permanecem no roadmap.

## 7. Área Financiamento

### 7.1 Relação com a opção de troca

A simulação pertence à única opção selecionada na área Financiamento e utiliza seus dados de compra. A alteração de preço, troca ou entrada recalcula os resultados. O financiamento não altera o TCO operacional do veículo.

### 7.2 Valor financiado

A precedência segue a regra normativa da seção 4.4 de `FINANCIAL_MODEL.md`. Os casos históricos `C-10` e `C-11` registram a origem dessa decisão, sem substituir a regra normativa:

```text
máximo entre zero e
preço - valor líquido da troca - entrada adicional + custos financiados
```

- Se o preço estiver preenchido, o valor calculado será usado.
- O valor financiado manual será habilitado somente como fallback quando o preço não estiver preenchido, conforme o comportamento documentado.
- O valor manual nunca substituirá arbitrariamente um valor calculável.
- A origem “Calculado” ou “Informado manualmente” é um requisito normativo ainda não exposto pela UI da v1.1.0; o gap está registrado na seção 16.2.

### 7.3 Sistema contratual

O sistema de amortização do contrato é independente da estratégia aplicada aos aportes.

- Campo conceitual: `amortizationSystem`.
- Valor disponível na v1.x: `PRICE`.
- `SAC` pertence ao roadmap e não possui controle na interface atual.

A prestação PRICE é calculada pelo motor financeiro conforme `FINANCIAL_MODEL.md`. O valor da primeira prestação é resultado, não entrada. Períodos são índices mensais; não há data de início, competência, vencimento ou calendário contratual real.

### 7.4 Taxa, prazo e correção

A interface deve nomear o campo como **taxa efetiva mensal** ou **taxa efetiva anual**, conforme a periodicidade selecionada. A taxa contém:

- `value`: percentual informado pelo usuário;
- `periodicity`: `monthly` ou `annual`.

Internamente, o percentual é convertido para forma decimal. Uma taxa `monthly` é usada diretamente. Uma taxa `annual` é convertida para a taxa mensal efetiva equivalente por:

```text
monthlyRate = (1 + annualRate)^(1/12) - 1
```

A taxa mensal convertida não sofre arredondamento intermediário antes de alimentar o cronograma PRICE. Taxas nominais anuais e CET permanecem fora desta convenção e exigem tratamento próprio no modelo financeiro.

Outras entradas contratuais são prazo original em meses, custos incorporados ao principal e cobranças periódicas. Correção monetária não é implementada na v1.x; o modelo atual equivale a um contrato sem correção adicional. CET e taxa nominal anual também não são implementados.

### 7.5 Custos financiados e cobranças periódicas

Os dois grupos terão tratamentos distintos:

- **Custos incorporados ao principal:** aumentam o valor financiado e, portanto, o saldo sujeito ao contrato.
- **Seguros e taxas periódicos:** são adicionados ao desembolso do período, aparecem discriminados no cronograma e não aumentam o principal.

Cada cobrança periódica deve ter descrição, valor por ocorrência, período inicial, período final opcional e frequência. Sua classificação como custo econômico deve seguir o modelo financeiro e não será presumida apenas por compor o pagamento.

## 8. Aportes extraordinários

### 8.1 Agenda

Cada aporte terá:

- valor;
- período inicial;
- período final opcional;
- frequência em meses;
- indicador de recorrência.

Para aporte único:

- `recurring` será falso;
- o período inicial identifica a única ocorrência;
- poderá ser qualquer período válido do contrato;
- período final e frequência não serão exigidos.

Para aporte recorrente:

- `recurring` será verdadeiro;
- frequência será um inteiro positivo;
- período final será opcional;
- sem período final, a recorrência segue até a quitação.

Ocorrências após a quitação não são aplicadas. O aporte aplicado é `min(aporte planejado, saldo elegível depois da prestação)`. O excedente não é aplicado, não vira custo, não é carregado e não entra no total desembolsado. Evidenciá-lo melhor na UI é uma melhoria de UX possível. A edição manual de uma ocorrência substitui somente o valor recorrente daquele período.

### 8.2 Estratégias

O campo conceitual `extraPaymentStrategy` é separado de `amortizationSystem`:

| Estratégia | Comportamento |
| --- | --- |
| `none` | Ignora a agenda de aportes extraordinários, mantém cobranças periódicas e serve como baseline. |
| `reducePayment` | Calcula a prestação do período antes do aporte; o aporte reduz o saldo e as prestações futuras são recalculadas. Normalmente preserva o prazo, mas pode quitar antes. |
| `reduceTerm` | Mantém a prestação de referência, reduz o prazo e pode usar uma última prestação menor para quitar exatamente o saldo. |

`reduceTerm` não representa antecipação explícita de parcelas finais. `prepayTailInstallments` não existe na aplicação atual, não aparece nas três estratégias e pertence exclusivamente ao roadmap.

No roadmap, `prepayTailInstallments` preserva o conceito de parcelas finais elegíveis, valor presente e regras contratuais próprias. Uma eventual reserva separada não reduz a dívida antes do uso. O tratamento de eventual saldo remanescente continua aberto.

Esse conceito de roadmap não foi observado na planilha nem está implementado.

## 9. Comparação de estratégias

A comparação do Laboratório produz três cenários a partir do mesmo contrato:

1. **Sem amortização:** `none`, sem aplicar a agenda de aportes.
2. **Reduzir parcela:** mesma agenda aplicada com `reducePayment`.
3. **Reduzir prazo:** mesma agenda aplicada com `reduceTerm`.

A comparação deve mostrar para os três cenários:

- valor financiado;
- prestação inicial;
- juros totais;
- total pago (fluxo total desembolsado);
- prazo original;
- prazo efetivo;
- economia de juros em relação ao baseline;
- meses antecipados;
- evolução mensal do saldo devedor.

Para o baseline, economia de juros e meses antecipados são zero. Os três cenários são calculados de forma independente e o baseline permanece idêntico.

## 10. Cronograma e composição financeira

O cronograma mensal segue a ordem definida em `FINANCIAL_MODEL.md` e deve continuar até a quitação. Nenhum limite interno pode truncar silenciosamente os resultados.

O motor não realiza arredondamento intencional em taxa, juros, principal, prestação ou saldo entre períodos e preserva a precisão nativa do tipo numérico adotado. Cada período usa o saldo interno final do período anterior. Totais são calculados a partir dos valores internos, não pela soma dos valores visualmente arredondados.

A regra normativa de apresentação monetária exige duas casas decimais com empates para longe de zero (`halfExpand`; equivalente ao `half-up` convencional para valores não negativos). A v1.1.0 usa o default normativo de `Intl.NumberFormat`, e o runtime auditado coincide com essa regra. Falta teste específico para valores exatamente no meio do incremento e configuração explícita do modo; não foi observada divergência de comportamento. A soma manual de linhas exibidas pode diferir alguns centavos dos totais internos.

A última amortização é limitada ao principal remanescente e deve encerrar o saldo em zero, sem produzir saldo negativo.

Cada período apresentará, quando aplicável:

- número do período;
- saldo inicial;
- juros;
- principal amortizado pela prestação;
- prestação contratual;
- aporte extraordinário;
- seguros e taxas periódicos;
- pagamento total do período;
- saldo final.

### 10.1 Total pago e fluxo total desembolsado

```text
prestações contratuais
+ aportes extraordinários
+ cobranças periódicas
```

A composição financeira acumulada será mostrada separadamente como:

- principal total amortizado;
- juros;
- encargos e cobranças periódicas.

O principal total amortizado inclui tanto o principal contido nas prestações quanto os aportes extraordinários. Os aportes podem aparecer como detalhamento do principal e do fluxo, mas não serão somados novamente como categoria econômica independente.

O total pago e sua composição fecham matematicamente com base nos valores internos. Correção monetária não participa porque não é implementada. A apresentação segue a regra de `halfExpand`, com a lacuna de teste explícito já registrada.

### 10.2 Visualização

A evolução do financiamento possui:

- comparação simultânea de `none`, `reducePayment` e `reduceTerm`;
- representação visual do saldo ao longo do tempo;
- gráficos de saldo, composição do pagamento e prestação;
- tabela mensal ou anual com filtros;
- exportação CSV da visão e do filtro ativos;
- indicação clara do período de quitação.

### 10.3 Ciladômetro e fluxo de caixa real

O Ciladômetro analisa uma ou duas opções, sempre contra o veículo atual. Para cada opção, calcula as três estratégias existentes e recomenda objetivamente a de menor impacto acumulado no prazo contratual original, preservando empates. O impacto de cada período usa o cronograma real:

```text
impacto líquido do período = period.totalPayment - economia operacional mensal
```

`period.totalPayment` já inclui a prestação, o aporte efetivamente aplicado e as cobranças daquele período. Após a quitação, o pagamento financeiro é zero e a diferença operacional continua no horizonte. Ao comparar duas opções, ambas usam o maior prazo contratual original como horizonte comum. A tela apresenta as métricas correspondentes lado a lado; uma opção sem financiamento continua exibindo seu TCO, não bloqueia a outra e não participa de uma classificação financeira incompleta.

## 11. Persistência da base v1.1.0

- Os dados são salvos automaticamente no `localStorage` do dispositivo e perfil de navegador atuais, sob schema versionado.
- Na base v1.1.0, conta, sincronização e backend ainda não existiam. A seção 15.2.1 descreve a mudança da v1.3.0.
- Persistem veículo atual, opções de troca, seleções unitárias compatíveis e entradas das simulações associadas.
- A primeira seleção compatível é persistida; a segunda seleção de Comparação e Ciladômetro é local à tela.
- Cronogramas, TCOs e métricas do Ciladômetro são recalculados e não são persistidos como autoridade.
- O tema é persistido em chave separada dos dados financeiros.
- O usuário possui ação explícita para apagar os dados financeiros locais, com confirmação.
- Falhas de leitura ou gravação local devem gerar mensagem compreensível sem apagar silenciosamente os dados em memória.

O Laboratório exporta sua tabela ativa em CSV no navegador. A importação local e a sincronização são acrescentadas na v1.3.0; importação de arquivos externos permanece no roadmap.

## 12. Validações, erros e estados vazios

### 12.1 Validações gerais

- valores monetários e consumos não podem ser negativos;
- quilometragem deve ser positiva quando necessária ao cálculo;
- percentuais devem respeitar limites coerentes com sua unidade;
- prazo, períodos e frequências devem ser inteiros positivos;
- período final não pode anteceder o inicial;
- a divisão de uso do PHEV deve totalizar 100%;
- taxas, prazos, consumos ou preços inválidos devem impedir o resultado dependente, sem gerar zero plausível.

### 12.2 Estados da simulação

- **Sem opção selecionada:** orientar o cadastro ou a seleção de uma opção.
- **Financiamento incompleto:** exibir erro de validação e não apresentar resultados antigos como atuais. Uma lista consolidada de todos os campos ausentes não existe na v1.1.0 e permanece no roadmap.
- **Sem aportes:** permitir calcular `none` e explicar como adicionar uma agenda.
- **Aporte posterior à quitação:** a ocorrência não integra o schedule.
- **Aporte superior ao saldo elegível:** aplicar somente o saldo elegível; destacar o excedente é melhoria de UX.
- **Erro de cálculo:** preservar entradas e evitar resultados parciais apresentados como válidos.

## 13. Requisitos de experiência

- Usar português do Brasil, moeda em reais e unidades sempre visíveis.
- Empregar divulgação progressiva: campos específicos aparecem conforme motorização, estratégia ou tipo de cobrança.
- Mostrar premissas importantes perto dos resultados e permitir retornar à origem para editá-las.
- Diferenciar visualmente entrada, resultado calculado e dado indisponível.
- Não depender somente de cores para economia, custo ou erro.
- Manter comparação lado a lado em telas amplas e empilhar os mesmos blocos em telas estreitas.
- Preservar o contexto ao navegar entre veículos, comparação e financiamento.
- Usar textos curtos para explicar TCO, principal, juros, aportes e estratégias.
- Não apresentar estimativas como propostas bancárias ou valores contratuais garantidos.

## 14. Sistema visual e responsividade

- Temas claro e escuro, com preferência local e respeito ao tema do sistema na primeira visita.
- Layout responsivo em desktop, tablet e celular.
- Comparação lado a lado quando houver espaço e empilhamento em telas estreitas.
- Tabelas largas com scroll horizontal localizado.
- Gráficos responsivos e legíveis.
- Foco visível, labels associados e informação que não dependa exclusivamente de cor.

Esta especificação não fixa CSS, posição exata ou dimensão de componentes.

### 14.1 Release visual da v1.2.0

As decisões implementadas na v1.2.0 estão em [UX_REDESIGN_V1_2.md](UX_REDESIGN_V1_2.md): referência violeta, seleção compacta de até quatro opções nas telas comparativas, métricas proporcionais, destaques objetivos com preservação de empates e apresentação do Ciladômetro. As seções anteriores que mencionam o limite de duas opções descrevem a base v1.1.0; esta seção prevalece para a v1.2.0. O `APPLICATION_GUIDE.md` registra as diferenças implementadas em adendo próprio. Contas e garagem remota são acrescentadas na v1.3.0, conforme a seção 15.2.1.

Diretrizes aprovadas para a v1.2.0 em 2026-10-12: cabeçalhos compactos alinhados; “Minha garagem” enquanto não houver usuário autenticado; “Simular financiamento”; faixa com até quatro veículos visíveis. Com cinco ou mais cadastrados, o quarto cartão vira “+N” e abre os demais, mantendo o painel ao lado do título no desktop. Comparação e Ciladômetro aceitam até quatro opções, enquanto Financiamento permanece unitário. A primeira seleção continua persistida; as demais são locais. A ordem dos veículos permanece estável ao selecionar; os controles usam coluna reservada para checkbox/radio e título legível. O limite máximo é indicado sem contador visual de selecionados; a escolha única do financiamento conserva semântica radio, indicador quadrado e altura estável ao alternar veículos. Os ícones dos parâmetros financeiros são menores que os dos títulos de seção. Resultado operacional e tabela detalhada permanecem na Comparação, sem o fechamento redundante. O tema fica no rodapé da sidebar, também acessível na navegação mobile. O header inclui acesso visual à conta, com estado explícito de autenticação ainda indisponível, até a integração de backend.

O Ciladômetro consolida no card de cada opção a estratégia compacta, empates expansíveis, primeiro período (prestação integral, aporte, cobranças, pagamento financeiro e impacto líquido) e horizonte (impactos médio, maior, menor e acumulado, prazos e totais contratuais). O custo de uso (TCO e economia operacional) permanece em seção inferior separada. Quando há uma opção, os dois cards ocupam a largura útil; com múltiplas opções, usam grid responsivo. O dourado identifica exclusivamente o menor impacto acumulado em uma comparação financeira completa e sem empate, sem significar melhor carro ou economia líquida. Após quitação, o impacto é explicado no custo de uso sem repetir numericamente a economia operacional. Lucide padroniza a iconografia decorativa; “Reduzir parcela” usa `trending-down`. Títulos, textos, sinais e foco continuam comunicando os estados. Cadastro usa cabeçalhos e opções automáticas com linguagem visual compartilhada, mantendo os comportamentos próprios.

## 15. Escopo

### 15.1 Implementado na v1.x

- um veículo atual e múltiplas opções de troca;
- ICE, HEV, PHEV e BEV;
- cards com quilometragem anual, TCO de caixa mensal e valor de mercado;
- cópia opcional da quilometragem atual ao cadastrar uma opção;
- comparação do atual com até quatro opções simultaneamente;
- TCO de caixa e econômico em visão anual normalizada, apresentados por mês, por ano e por km;
- detalhamento dos componentes do TCO;
- economia ou custo adicional da troca;
- financiamento PRICE;
- taxa efetiva mensal ou anual, com conversão anual equivalente definida pelo modelo financeiro;
- custos incorporados ao principal e cobranças periódicas separadas;
- aportes únicos, recorrentes e substituições manuais por período;
- `none`, `reducePayment` e `reduceTerm`;
- comparação simultânea das três estratégias;
- Laboratório com gráficos, tabela mensal/anual, filtros e CSV;
- Ciladômetro de até quatro opções baseado no fluxo real do cronograma;
- cronograma e evolução até a quitação;
- persistência local para visitantes; conta confirmada por email com garagem remota e importação local explícita;
- temas claro e escuro e layout responsivo.

### 15.2 Roadmap

- sistema SAC;
- `prepayTailInstallments` e sua reserva após definição contratual completa;
- múltiplos planos recorrentes independentes;
- múltiplos contratos ou cenários salvos para a mesma opção;
- importação de arquivos de dados externos;
- histórico detalhado de abastecimentos e serviços;
- TCO por período de posse;
- divisão de uso do PHEV por dias, viagens ou energia medida;
- curvas de depreciação e valor residual informado;
- inflação e valor do dinheiro no tempo;
- hospedagem gratuita e PWA;
- controle transacional de edição simultânea entre dispositivos;
- rascunhos de formulários incompletos;
- mensagens de validação associadas individualmente aos campos e lista consolidada de campos ausentes;
- atalhos contextuais na Comparação para editar veículos, selecionar financiamento, retornar à garagem e abrir resumo ou tela de financiamento;
- APIs externas para preços, FIPE ou índices, se futuramente aprovadas.

Nenhum item de roadmap deve ser descrito como implementado sem código, testes e atualização do `APPLICATION_GUIDE.md`.

### 15.2.1 Contas e garagem sincronizada — v1.3.0

O usuário pode continuar sem conta com os dados no `localStorage` deste navegador ou criar uma conta com nome, email, senha e confirmação da senha no formulário. O cadastro por email exige confirmação do endereço antes do primeiro acesso à conta. O modo visitante mantém as quatro áreas e os cálculos atuais; deve informar que os dados locais podem desaparecer e não são sincronizados.

Após autenticação, veículo atual, opções de troca, entradas dos financiamentos por opção e as seleções persistentes pertencem à conta e são carregados em seus dispositivos. Os cálculos de TCO, PRICE, cronogramas e Ciladômetro permanecem no navegador e não são gravados como resultados autoritativos. Tema e seleções adicionais temporárias continuam locais. O banco separa os registros por proprietário e impede que uma conta leia ou altere a garagem de outra.

No primeiro acesso autenticado com dados locais existentes, o aplicativo oferece importação explícita para a conta. Não apaga a cópia local nem substitui dados remotos sem escolha do usuário e confirmação de sucesso. Ao sair da conta, dados remotos não permanecem expostos no modo visitante. Se houver garagem remota e garagem local, o aplicativo deve apresentar uma decisão compreensível antes de substituir dados. Antes de gravar, o cliente compara a garagem remota com a versão carregada; se ela mudou, interrompe a gravação e pede escolha explícita para substituí-la. Gravações iniciadas exatamente ao mesmo tempo ainda exigem controle transacional futuro. A implementação preserva o comportamento financeiro e funcional da v1.2.0.

O envio de confirmação para usuários externos depende de um serviço de email configurado para produção no Supabase. A v1.3.0 mantém o envio padrão por decisão do usuário, de modo que cadastro e recuperação por email podem funcionar apenas para endereços autorizados na equipe do projeto. O cadastro público não deve ser anunciado como pronto até a configuração e o teste do SMTP próprio.

### 15.3 Fora de escopo previsível

- integração com bancos ou financeiras;
- captura automática de contratos;
- recomendação de crédito, investimento ou decisão financeira;
- garantia de preço, tributo, taxa ou condição comercial;
- reprodução literal do simulador ou da planilha de referência;
- score arbitrário de “melhor carro”.

## 16. Decisões financeiras

### 16.1 Regras vigentes originadas no baseline da v1

1. `monthly` e `annual` representam taxas efetivas. A mensal é usada diretamente; a anual é convertida por equivalência composta sem arredondamento intermediário.
2. O cronograma preserva a precisão nativa entre períodos, calcula totais com valores internos e limita a última amortização ao principal remanescente.
3. A regra normativa de apresentação é duas casas com empates para longe de zero (`halfExpand`); a implementação atual possui a lacuna de teste descrita abaixo.
4. O TCO usa visão anual normalizada, apresentada por mês, por ano e por km; horizonte de posse permanece no roadmap.
5. O PHEV divide percentualmente a quilometragem anual entre modo elétrico e combustão, totalizando 100%; outros critérios permanecem no roadmap.
6. A depreciação usa `valor de mercado × taxa anual de depreciação`; curvas e valor residual permanecem no roadmap.
7. O TCO econômico atual é TCO de caixa mais depreciação anual.
8. Correção monetária não é implementada; o contrato atual equivale a ausência de correção adicional.

### 16.2 Lacunas confirmadas

- **Origem do valor financiado:** a camada de aplicação diferencia valor calculado e fallback manual, mas a UI da v1.1.0 não apresenta o rótulo “Calculado” ou “Informado manualmente”.
- **Garantia de arredondamento visual:** `Intl.NumberFormat` usa por padrão `halfExpand`, e o runtime auditado coincide com a regra normativa. Não há bug de comportamento observado; falta teste específico de empates e configuração explícita do modo. Essa lacuna não altera a regra de precisão interna.

### 16.3 Decisões ainda abertas

As decisões abaixo continuam bloqueando somente as funcionalidades que dependem delas:

1. classificação econômica da correção monetária;
2. representação de CET, taxas nominais anuais e encargos contratuais;
3. composição patrimonial da compra e da revenda, incluindo o tratamento do valor residual; a depreciação simples da v1.x não resolve essa questão;
4. regras contratuais de `prepayTailInstallments`, incluindo valor presente, elegibilidade, descontos, tarifas, arredondamento e tratamento de eventual reserva remanescente na quitação.

Até essas definições serem aprovadas, funcionalidades dependentes não podem criar resultados por aproximação silenciosa.

## 17. Critérios de aceite da v1.x

1. O usuário cadastra e edita o veículo atual e opções das quatro motorizações; pode copiar a quilometragem atual sem criar vínculo persistente.
2. O PHEV divide a quilometragem anual por percentuais entre eletricidade e combustão, totalizando 100% e sem dupla contagem.
3. A comparação aceita uma ou duas opções contra o veículo atual e apresenta TCO de caixa e econômico separadamente por mês, por ano e por km.
4. A depreciação anual é calculada como `valor de mercado × taxa anual de depreciação`.
5. Economia e custo adicional usam direção e rótulos inequívocos.
6. O Financiamento continua unitário e sua seleção não altera o TCO operacional.
7. O valor financiado calculado tem precedência; o manual funciona somente como fallback quando o preço não estiver preenchido.
8. O sistema contratual é PRICE e aparece separado da estratégia extraordinária.
9. A interface identifica a taxa como efetiva mensal ou anual; a mensal é usada diretamente e a anual é convertida por `monthlyRate = (1 + annualRate)^(1/12) - 1` sem arredondamento intermediário.
10. `1,7% a.m.` e aproximadamente `22,4197350053% a.a.` efetivos produzem a mesma taxa mensal interna e preservam os golden cases PRICE correspondentes.
11. O motor não arredonda intencionalmente taxa, juros, principal, prestação ou saldo entre períodos; usa o saldo interno anterior e calcula totais com valores internos.
12. A apresentação usa duas casas e `halfExpand`; a lacuna de teste específico para empates e configuração explícita permanece registrada.
13. A última amortização é limitada ao principal remanescente e encerra o saldo em zero sem saldo negativo.
14. A prestação inicial é calculada e não pode ser digitada como entrada padrão.
15. Custos financiados aumentam o principal; seguros e taxas periódicos apenas aumentam o desembolso dos períodos correspondentes.
16. Um aporte único pode ser agendado em qualquer período válido.
17. Um aporte recorrente respeita início, fim opcional e frequência.
18. `reducePayment` reduz prestações futuras e pode quitar antes; `reduceTerm` mantém a prestação de referência e reduz o prazo.
19. O Laboratório compara exatamente `none`, `reducePayment` e `reduceTerm` com a mesma base contratual.
20. Os resultados incluem valor financiado, prestação inicial, juros, fluxo total, prazos, economia, meses antecipados e saldo mensal.
21. O fluxo total soma prestações, aportes e cobranças periódicas sem contar aportes duas vezes na composição.
22. Principal, juros e cobranças aparecem discriminados; correção monetária não existe na v1.x.
23. O cronograma alcança a quitação ou informa explicitamente por que ela não pôde ser calculada.
24. Os dados permanecem após recarregar o aplicativo e podem ser apagados por ação confirmada.
25. Os cálculos PRICE aplicáveis reconciliam os golden cases de `FINANCIAL_MODEL.md` com as tolerâncias documentadas.
26. Nenhuma tela classifica principal amortizado como custo econômico.
27. O Ciladômetro usa `period.totalPayment - economia operacional mensal` para cada período e não ignora aportes ou cobranças aplicados.
28. Uma opção sem financiamento não bloqueia a análise de outra opção financiada.

## Histórico de revisões

| Revisão | Aplicação auditada | Data | Alterações |
| --- | --- | --- | --- |
| 1.0.0 | 1.1.0 (`63e48ad`) | 2026-10-11 | Início da governança formal; correção de escopo, cadastro, TCO econômico, financiamento, estratégias, persistência, responsividade e roadmap; registro dos gaps reais de UI e da lacuna de teste de arredondamento. |
| 1.0.1 | 1.1.0 (`63e48ad`) | 2026-10-12 | Referência explícita ao RC visual da v1.2 em revisão, sem promover seu comportamento à base publicada. |
| 1.0.2 | 1.1.0 (`63e48ad`) | 2026-10-12 | Novas decisões do RC: cabeçalhos compactos, seleção de até quatro opções, financiamento unitário, espaço de conta e prestação contratual em destaque no Ciladômetro. |
| 1.0.3 | Base 1.1.0 (`63e48ad`); RC não publicado | 2026-10-12 | Consolidação de UX e Lucide; controles estáveis, tema na sidebar, formulário compartilhado e propriedade das métricas do Ciladômetro, com dourado reservado ao vencedor calculado. |
| 1.0.4 | Base 1.1.0 (`63e48ad`); RC não publicado | 2026-10-12 | Refinamento dos seletores, da densidade vertical, do card único do Ciladômetro e da iconografia da estratégia, sem mudança funcional. |
| 1.0.5 | Base 1.1.0 (`63e48ad`); RC não publicado | 2026-10-12 | Quarto cartão “+N” para cinco ou mais veículos, seletor unitário com indicador quadrado, ícones de parâmetros menores e retirada do fechamento repetido da Comparação. |
| 1.0.6 | 1.2.0 (`v1.2.0`) | 2026-10-12 | Promoção da revisão visual a release oficial; seção 14.1 passa a definir o limite de quatro opções e a UX vigente. |
| 1.0.7 | 1.2.0 (`v1.2.0`) | 2026-10-12 | Define a próxima etapa de contas confirmadas por email, modo visitante local, garagem por usuário, importação explícita e preservação dos cálculos; implementação ainda pendente. |
| 1.0.8 | 1.3.0 | 2026-10-12 | Promove contas, garagem remota e importação à v1.3; explicita a detecção de alterações entre sessões e o limite de concorrência simultânea. |
| 1.0.9 | 1.4.0 local | 2026-10-12 | Define foto de perfil, edição dos dados da conta e limpeza da garagem na tela de configurações. |
| 1.0.10 | 1.4.0 local | 2026-10-12 | Exige modo de consulta, edição explícita e confirmação antes de salvar nome, email, senha ou foto. |
| 1.0.11 | 1.4.0 | 2026-10-12 | Promove o fluxo de configurações à release oficial. |
