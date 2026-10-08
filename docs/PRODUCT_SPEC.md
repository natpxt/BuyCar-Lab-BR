# Especificação do produto — v1

## 1. Objetivo e proposta de valor

O BuyCar Lab - BR é um aplicativo pessoal, local e em português do Brasil para apoiar a decisão de manter ou trocar um veículo. O produto reúne, em um fluxo único, o cadastro dos veículos, a comparação de custo total de propriedade, a simulação do financiamento da opção escolhida e o Ciladômetro.

O MVP deve responder com clareza:

- quanto cada veículo custa por mês, por ano e por quilômetro;
- quanto da diferença representa economia ou custo adicional;
- como a compra financiada afeta o caixa mensal;
- quanto aportes extraordinários alteram prestação, prazo, juros e saldo devedor.

A experiência não reproduz a estrutura de abas da planilha. Os dados são organizados pelas tarefas do usuário: **Veículos**, **Comparação**, **Financiamento** e **Ciladômetro**.

### 1.1 Fontes de autoridade

1. `docs/FINANCIAL_MODEL.md` é a autoridade para fórmulas, conceitos financeiros, arredondamentos, limitações e golden cases.
2. O Simulador de amortização do Investidor Sardinha orienta funcionalidades da área de financiamento, como parâmetros contratuais, agenda de aportes e comparação entre reduzir prazo ou prestação.
3. A referência funcional não substitui as regras financeiras documentadas e sua interface visual não deve ser copiada.

Quando esta especificação e o modelo financeiro parecerem divergir, prevalece `FINANCIAL_MODEL.md`. Uma mudança de fórmula exige primeiro a atualização e validação do modelo financeiro.

## 2. Usuário e jornadas principais

### 2.1 Perfil

O usuário é o proprietário de um veículo que deseja avaliar uma possível troca com seus próprios dados. Ele conhece ou estima custos anuais, consumo, quilometragem e condições de financiamento. O MVP atende uma pessoa em um único dispositivo, sem conta compartilhada.

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
- **TCO econômico:** TCO de caixa acrescido de depreciação e encargos econômicos definidos pelo modelo.
- **Fluxo do financiamento:** entrada, prestações, principal, juros, correção, encargos periódicos e aportes.

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
| Valor | Preço ou valor atual, taxa anual de depreciação | Necessários para o TCO econômico pela regra simples vigente. |
| Propriedade | Seguro, IPVA, licenciamento e manutenção anuais | Valores não negativos, sempre identificados como anuais. |
| Compra da opção | Preço de aquisição e valor líquido esperado da troca | Alimentam o financiamento, sem integrar automaticamente o TCO operacional. |

Os valores atuais do Tiida não serão usados como padrões de formulário.

No MVP, a depreciação anual será calculada pela regra simples `valor do veículo × taxa anual de depreciação`. Curvas de depreciação e valor residual por horizonte permanecem pós-MVP. Essa regra define um componente do TCO econômico e não resolve a composição patrimonial da compra ou da revenda.

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

Os percentuais de uso elétrico e a combustão devem somar 100% da quilometragem anual. Modelos por dias, viagens ou energia medida ficam para o pós-MVP. O custo de cada fonte será calculado separadamente para impedir dupla contagem.

### 5.4 Estados

- **Sem veículo atual:** explicar que ele é necessário como referência e oferecer a ação “Cadastrar veículo atual”.
- **Sem opções de troca:** oferecer “Adicionar opção”.
- **Cadastro incompleto:** salvar o rascunho, identificar os campos pendentes e bloquear apenas os resultados que dependem deles.
- **Valor inválido:** associar a mensagem ao campo e preservar os dados já preenchidos.

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

O MVP usa uma visão anual normalizada do TCO. Os valores mensais derivam do total anual dividido por 12, e os valores por quilômetro usam o total anual dividido pela quilometragem anual declarada. Se a quilometragem estiver ausente ou for inválida, o resultado por km não será exibido e haverá uma mensagem específica. Análises por horizonte de posse permanecem pós-MVP.

### 6.2 Leitura dos resultados

- Verde, ícones ou texto podem reforçar economia, mas a informação não pode depender somente de cor.
- A direção do cálculo deve aparecer junto ao resultado: “veículo atual menos opção de troca”.
- TCO de caixa e econômico nunca serão combinados em um único número.
- O custo de aquisição e o financiamento não alterarão os cartões de TCO.
- Após existir uma simulação, a tela poderá mostrar um resumo separado do impacto de caixa da troca e oferecer “Ver financiamento”.

### 6.3 Ações

- trocar as opções comparadas, respeitando o limite de duas;
- editar qualquer um dos dois veículos;
- selecionar uma opção para financiamento;
- retornar à lista de veículos.

## 7. Área Financiamento

### 7.1 Relação com a opção de troca

A simulação pertence à única opção selecionada na área Financiamento e utiliza seus dados de compra. A alteração de preço, troca ou entrada recalcula os resultados. O financiamento não altera o TCO operacional do veículo.

### 7.2 Valor financiado

A precedência deve reproduzir exatamente `C-10` e `C-11` do modelo financeiro:

```text
máximo entre zero e
preço - valor líquido da troca - entrada adicional + custos financiados
```

- Se o preço estiver preenchido, o valor calculado será usado.
- O valor financiado manual será habilitado somente como fallback quando o preço não estiver preenchido, conforme o comportamento documentado.
- O valor manual nunca substituirá arbitrariamente um valor calculável.
- A origem “Calculado” ou “Informado manualmente” deve aparecer junto ao resultado.

### 7.3 Sistema contratual

O sistema de amortização do contrato é independente da estratégia aplicada aos aportes.

- Campo conceitual: `amortizationSystem`.
- Valor disponível no MVP: `PRICE`.
- `SAC` será listado na seção pós-MVP e previsto como futuro valor do domínio, sem controle habilitado na interface atual.

A prestação PRICE será calculada pelo motor financeiro conforme `FINANCIAL_MODEL.md`. O valor da primeira prestação é resultado, não entrada. A data ou competência de início do cronograma continua sendo uma entrada.

### 7.4 Taxa, prazo e correção

A interface deve nomear o campo como **taxa efetiva mensal** ou **taxa efetiva anual**, conforme a periodicidade selecionada. A taxa contém:

- `value`: percentual informado pelo usuário;
- `periodicity`: `monthly` ou `annual`.

Internamente, o percentual é convertido para forma decimal. Uma taxa `monthly` é usada diretamente. Uma taxa `annual` é convertida para a taxa mensal efetiva equivalente por:

```text
monthlyRate = (1 + annualRate)^(1/12) - 1
```

A taxa mensal convertida não sofre arredondamento intermediário antes de alimentar o cronograma PRICE. Taxas nominais anuais e CET permanecem fora desta convenção e exigem tratamento próprio no modelo financeiro.

Outras entradas contratuais são prazo original em meses, custos incorporados ao principal e cobranças periódicas. A correção monetária permanece neutra, em zero, na v1. O aplicativo não consulta TR, IPCA ou outros índices; qualquer suporte futuro depende de regra aprovada no modelo financeiro.

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

Ocorrências após a quitação não serão aplicadas. Todo aporte será limitado ao principal elegível; excedentes devem ser rejeitados ou informados explicitamente, nunca convertidos em custo. A edição manual de uma ocorrência poderá substituir o valor recorrente daquele período conforme a regra existente, sem alterar as demais ocorrências.

### 8.2 Estratégias

O campo conceitual `extraPaymentStrategy` é separado de `amortizationSystem`:

| Estratégia | Comportamento |
| --- | --- |
| `none` | Segue o contrato sem amortização extraordinária e serve como baseline. |
| `reducePayment` | Amortiza o saldo, reduz prestações futuras e preserva o prazo contratual. |
| `reduceTerm` | Amortiza o saldo, mantém a prestação de referência e reduz o prazo efetivo. |
| `prepayTailInstallments` | Liquida parcelas finais específicas pelo valor presente segundo regras da financeira. |

`reduceTerm` não representa antecipação explícita de parcelas finais. `prepayTailInstallments` permanecerá pós-MVP e visível como indisponível enquanto não existirem parcelas elegíveis, data de liquidação, taxa de desconto, encargos preservados ou dispensados e arredondamento contratual aprovados.

Como requisito funcional futuro do produto, valores destinados a `prepayTailInstallments` poderão acumular em uma reserva separada. Uma parcela final elegível somente será liquidada quando a reserva cobrir integralmente seu valor de liquidação na data. O saldo não utilizado continuará disponível para períodos seguintes. Somente o valor efetivamente usado na liquidação reduzirá a dívida; antes disso, a reserva não será amortização de principal nem custo econômico. O tratamento de eventual reserva remanescente na quitação continuará como decisão futura explícita.

Esse comportamento de reserva é um requisito aprovado do produto. Ele não foi observado na planilha nem no simulador do Investidor Sardinha.

## 9. Comparação de estratégias

A comparação do Laboratório produz três cenários a partir do mesmo contrato:

1. **Sem amortização:** `none`, sem aplicar a agenda de aportes.
2. **Reduzir parcela:** mesma agenda aplicada com `reducePayment`.
3. **Reduzir prazo:** mesma agenda aplicada com `reduceTerm`.

A comparação deve mostrar para ambos:

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

O motor não realiza arredondamento intencional em taxa, correção, juros, principal, prestação ou saldo entre períodos e preserva a precisão nativa do tipo numérico adotado. Cada período usa o saldo interno final do período anterior. Totais são calculados a partir dos valores internos, não pela soma dos valores visualmente arredondados.

Valores monetários são exibidos com duas casas decimais usando `half-up`. Essa é uma convenção do aplicativo e não um comportamento comprovado da planilha. A interface deve informar, quando necessário, que a soma manual das linhas exibidas pode diferir alguns centavos de um total calculado com valores internos.

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
- correção monetária;
- encargos e cobranças periódicas.

O principal total amortizado inclui tanto o principal contido nas prestações quanto os aportes extraordinários. Os aportes podem aparecer como detalhamento do principal e do fluxo, mas não serão somados novamente como categoria econômica independente.

O total pago e sua composição devem fechar matematicamente com base nos valores internos, considerando a forma como a correção afeta o saldo e os pagamentos. A exibição aplica duas casas em `half-up` somente depois dos cálculos. A classificação econômica da correção permanece uma decisão aberta e não pode ser inferida pela interface.

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

## 11. Persistência local

- Os dados serão salvos automaticamente no dispositivo e perfil de navegador atuais.
- Não haverá conta, sincronização, backend ou envio para serviços externos.
- Persistem veículo atual, opções de troca, seleções unitárias compatíveis e entradas das simulações associadas.
- A segunda seleção de Comparação e Ciladômetro é uma preferência local da tela e não altera o schema da v0.9.0.
- Cronogramas, TCOs e métricas do Ciladômetro são recalculados e não são persistidos como autoridade.
- O usuário terá uma ação explícita para apagar todos os dados locais, acompanhada de confirmação e explicação de irreversibilidade.
- Falhas de leitura ou gravação local devem gerar mensagem compreensível sem apagar silenciosamente os dados em memória.

O Laboratório exporta sua tabela ativa em CSV no navegador. Importação e sincronização ficam fora da v1.

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
- **Financiamento incompleto:** listar os campos necessários e não exibir resultados antigos como atuais.
- **Sem aportes:** permitir calcular `none` e explicar como adicionar uma agenda.
- **Aporte posterior à quitação:** informar que a ocorrência não foi aplicada.
- **Aporte superior ao saldo elegível:** mostrar o valor efetivamente aplicável e exigir tratamento explícito do excedente.
- **`prepayTailInstallments` indisponível:** informar quais dados contratuais ainda faltam.
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

## 14. Escopo

### 14.1 v1

- um veículo atual e múltiplas opções de troca;
- ICE, HEV, PHEV e BEV;
- cards com quilometragem anual, TCO de caixa mensal e valor de mercado;
- cópia opcional da quilometragem atual ao cadastrar uma opção;
- comparação do atual com uma ou duas opções simultaneamente;
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
- Ciladômetro de uma ou duas opções baseado no fluxo real do cronograma;
- cronograma e evolução até a quitação;
- persistência local.

### 14.2 Pós-v1

- sistema SAC;
- `prepayTailInstallments` e sua reserva após definição contratual completa;
- múltiplos planos recorrentes independentes;
- múltiplos contratos ou cenários salvos para a mesma opção;
- importação de dados;
- histórico detalhado de abastecimentos e serviços;
- TCO por período de posse;
- divisão de uso do PHEV por dias, viagens ou energia medida;
- curvas de depreciação e valor residual informado;
- inflação e valor do dinheiro no tempo;
- hospedagem gratuita e PWA;
- login, Supabase e sincronização entre dispositivos.

### 14.3 Fora de escopo

- backend, banco de dados remoto e cloud;
- autenticação e múltiplos usuários;
- APIs externas e atualização automática de preços, FIPE ou índices;
- integração com bancos ou financeiras;
- captura automática de contratos;
- recomendação de crédito, investimento ou decisão financeira;
- reprodução visual do simulador de referência.

## 15. Decisões financeiras

### 15.1 Decisões definidas para o MVP

1. `monthly` e `annual` representam taxas efetivas. A mensal é usada diretamente; a anual é convertida por equivalência composta sem arredondamento intermediário.
2. O cronograma preserva a precisão nativa entre períodos, calcula totais com valores internos, exibe moeda com duas casas em `half-up` e limita a última amortização ao principal remanescente.
3. O TCO usa visão anual normalizada, apresentada por mês, por ano e por km; horizonte de posse permanece pós-MVP.
4. O PHEV divide percentualmente a quilometragem anual entre modo elétrico e combustão, totalizando 100%; outros critérios permanecem pós-MVP.
5. A depreciação usa `valor do veículo × taxa anual de depreciação`; curvas e valor residual por horizonte permanecem pós-MVP.

### 15.2 Decisões ainda abertas

As decisões abaixo continuam bloqueando somente as funcionalidades que dependem delas:

1. classificação econômica da correção monetária;
2. representação de CET, taxas nominais anuais e encargos contratuais;
3. composição patrimonial da compra e da revenda, incluindo o tratamento do valor residual; a depreciação simples do MVP não resolve essa questão;
4. regras contratuais de `prepayTailInstallments`, incluindo valor presente, elegibilidade, descontos, tarifas, arredondamento e tratamento de eventual reserva remanescente na quitação.

Até essas definições serem aprovadas, a interface deve sinalizar a limitação correspondente e não criar resultados por aproximação silenciosa.

## 16. Critérios de aceite do MVP

1. O usuário cadastra e edita o veículo atual e opções das quatro motorizações; pode copiar a quilometragem atual sem criar vínculo persistente.
2. O PHEV divide a quilometragem anual por percentuais entre eletricidade e combustão, totalizando 100% e sem dupla contagem.
3. A comparação aceita uma ou duas opções contra o veículo atual e apresenta TCO de caixa e econômico separadamente por mês, por ano e por km.
4. A depreciação anual do MVP é calculada como `valor do veículo × taxa anual de depreciação`.
5. Economia e custo adicional usam direção e rótulos inequívocos.
6. O Financiamento continua unitário e sua seleção não altera o TCO operacional.
7. O valor financiado calculado tem precedência; o manual funciona somente como fallback quando o preço não estiver preenchido.
8. O sistema contratual é PRICE e aparece separado da estratégia extraordinária.
9. A interface identifica a taxa como efetiva mensal ou anual; a mensal é usada diretamente e a anual é convertida por `monthlyRate = (1 + annualRate)^(1/12) - 1` sem arredondamento intermediário.
10. `1,7% a.m.` e aproximadamente `22,4197350053% a.a.` efetivos produzem a mesma taxa mensal interna e preservam os golden cases PRICE correspondentes.
11. O motor não arredonda intencionalmente taxa, correção, juros, principal, prestação ou saldo entre períodos; usa o saldo interno anterior e calcula totais com valores internos.
12. Valores monetários são exibidos com duas casas em `half-up`, como convenção do aplicativo.
13. A última amortização é limitada ao principal remanescente e encerra o saldo em zero sem saldo negativo.
14. A prestação inicial é calculada e não pode ser digitada como entrada padrão.
15. Custos financiados aumentam o principal; seguros e taxas periódicos apenas aumentam o desembolso dos períodos correspondentes.
16. Um aporte único pode ser agendado em qualquer período válido.
17. Um aporte recorrente respeita início, fim opcional e frequência.
18. `reducePayment` mantém o prazo e reduz a prestação; `reduceTerm` mantém a prestação de referência e reduz o prazo.
19. `prepayTailInstallments` permanece separado e indisponível no MVP sem dados contratuais suficientes.
20. O Laboratório compara `none`, `reducePayment` e `reduceTerm` com a mesma base contratual.
21. Os resultados incluem valor financiado, prestação inicial, juros, fluxo total, prazos, economia, meses antecipados e saldo mensal.
22. O fluxo total soma prestações, aportes e cobranças periódicas sem contar aportes duas vezes na composição.
23. Principal, juros, correção e encargos aparecem discriminados.
24. O cronograma alcança a quitação ou informa explicitamente por que ela não pôde ser calculada.
25. Os dados permanecem após recarregar o aplicativo e podem ser apagados por ação confirmada.
26. Os cálculos PRICE aplicáveis reconciliam os golden cases de `FINANCIAL_MODEL.md` com as tolerâncias documentadas.
27. Nenhuma tela classifica principal amortizado como custo econômico.
28. O Ciladômetro usa `period.totalPayment - economia operacional mensal` para cada período e não ignora aportes ou cobranças aplicados.
29. Uma opção sem financiamento não bloqueia a análise de outra opção financiada.
