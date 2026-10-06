# Especificação do produto — MVP

## 1. Objetivo e proposta de valor

O Comparador de Carros é um aplicativo pessoal, local e em português do Brasil para apoiar a decisão de manter ou trocar um veículo. O produto reúne, em um fluxo único, o cadastro dos veículos, a comparação de custo total de propriedade e a simulação do financiamento do candidato escolhido.

O MVP deve responder com clareza:

- quanto cada veículo custa por mês, por ano e por quilômetro;
- quanto da diferença representa economia ou custo adicional;
- como a compra financiada afeta o caixa mensal;
- quanto aportes extraordinários alteram prestação, prazo, juros e saldo devedor.

A experiência não deve reproduzir a estrutura de abas da planilha. Os dados serão organizados pelas tarefas do usuário: **Veículos**, **Comparação** e **Financiamento**.

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
3. Cadastrar ao menos um candidato.
4. Abrir a comparação entre o atual e o candidato.

#### Comparar uma troca

1. Selecionar um candidato salvo.
2. Conferir premissas e eventuais dados ausentes.
3. Comparar TCO de caixa e TCO econômico.
4. Ver economia ou custo adicional mensal, anual e por quilômetro.
5. Escolher o candidato para simular a compra.

#### Simular financiamento

1. Conferir preço, valor de troca, entrada e custos financiados.
2. Informar contrato PRICE, taxa, periodicidade, prazo, data inicial, correção e cobranças periódicas.
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
- TCO de caixa mensal do candidato
```

Valor positivo significa economia. Valor negativo significa custo operacional adicional.

Quando houver financiamento, o impacto mensal da troca deve ser mostrado separadamente:

```text
pagamento financeiro do período
+ TCO de caixa mensal do candidato
- TCO de caixa mensal do veículo atual
```

Valor positivo representa saída adicional de caixa; valor negativo representa economia de caixa.

## 4. Estrutura de navegação

A navegação principal terá três áreas em sequência lógica:

1. **Veículos**
2. **Comparação**
3. **Financiamento**

O usuário poderá retornar às etapas anteriores sem perder dados. A seleção de um candidato na comparação será reutilizada ao abrir o financiamento. Não haverá navegação baseada nas abas ou nos nomes `_EV` da planilha.

## 5. Área Veículos

### 5.1 Responsabilidades

- manter exatamente um veículo atual;
- cadastrar, editar, duplicar e excluir candidatos;
- indicar claramente a motorização;
- mostrar se há dados suficientes para calcular TCO de caixa e econômico;
- permitir selecionar um candidato para comparação.

A exclusão do veículo atual exige confirmação e invalida comparações existentes. A exclusão de um candidato exige confirmação e remove sua simulação de financiamento associada.

### 5.2 Campos comuns

| Grupo | Campos | Regras de produto |
| --- | --- | --- |
| Identificação | Nome do veículo, motorização `ICE`, `HEV`, `PHEV` ou `BEV` | Nome e motorização são obrigatórios. |
| Uso | Quilometragem anual | Deve ser maior que zero para resultados por km. |
| Valor | Preço ou valor atual, taxa anual de depreciação | Necessários para o TCO econômico pela regra simples vigente. |
| Propriedade | Seguro, IPVA, licenciamento e manutenção anuais | Valores não negativos, sempre identificados como anuais. |
| Compra do candidato | Preço de aquisição e valor líquido esperado da troca | Alimentam o financiamento, sem integrar automaticamente o TCO operacional. |

Os valores atuais do Tiida não serão usados como padrões de formulário.

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

As parcelas elétrica e a combustão devem somar 100% da quilometragem. O MVP usará divisão por quilometragem; modelos por dias, viagens ou energia medida ficam para evolução posterior. O custo de cada fonte será calculado separadamente para impedir dupla contagem.

### 5.4 Estados

- **Sem veículo atual:** explicar que ele é necessário como referência e oferecer a ação “Cadastrar veículo atual”.
- **Sem candidatos:** oferecer “Adicionar candidato”.
- **Cadastro incompleto:** salvar o rascunho, identificar os campos pendentes e bloquear apenas os resultados que dependem deles.
- **Valor inválido:** associar a mensagem ao campo e preservar os dados já preenchidos.

## 6. Área Comparação

### 6.1 Responsabilidades

A tela compara o veículo atual com um candidato selecionado. Comparação entre dois candidatos fica fora do MVP.

Deve apresentar lado a lado:

- premissas principais e motorização;
- custo de energia ou combustível;
- manutenção, seguro, IPVA e licenciamento;
- depreciação separada;
- TCO de caixa mensal, anual e por km;
- TCO econômico mensal, anual e por km;
- diferença absoluta e percentual;
- economia ou custo adicional do candidato.

O cálculo por quilômetro usa a quilometragem anual declarada. Se ela estiver ausente ou for inválida, o resultado por km não será exibido e haverá uma mensagem específica.

### 6.2 Leitura dos resultados

- Verde, ícones ou texto podem reforçar economia, mas a informação não pode depender somente de cor.
- A direção do cálculo deve aparecer junto ao resultado: “veículo atual menos candidato”.
- TCO de caixa e econômico nunca serão combinados em um único número.
- O custo de aquisição e o financiamento não alterarão os cartões de TCO.
- Após existir uma simulação, a tela poderá mostrar um resumo separado do impacto de caixa da troca e oferecer “Ver financiamento”.

### 6.3 Ações

- trocar o candidato comparado;
- editar qualquer um dos dois veículos;
- selecionar o candidato para financiamento;
- retornar à lista de veículos.

## 7. Área Financiamento

### 7.1 Relação com o candidato

A simulação pertence ao candidato selecionado e utiliza seus dados de compra. A alteração de preço, troca ou entrada deve marcar os resultados anteriores como desatualizados até novo cálculo. O financiamento não altera o TCO operacional do veículo.

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

A taxa de juros contém:

- `value`: percentual informado;
- `periodicity`: `monthly` ou `annual`.

O motor financeiro será responsável por normalizar a taxa para a periodicidade mensal usada pelo cronograma. A convenção de conversão anual para mensal deve ser definida primeiro no modelo financeiro; esta especificação não cria a fórmula.

Outras entradas contratuais:

- data ou competência inicial;
- prazo original em meses;
- correção monetária, quando houver, conforme a ordem de cálculo documentada;
- custos incorporados ao principal;
- seguros e taxas periódicos.

O MVP não consultará automaticamente TR, IPCA ou outros índices. Qualquer correção suportada dependerá de valor explicitamente informado e de regra aprovada no modelo financeiro.

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

`reduceTerm` não representa antecipação explícita de parcelas finais. `prepayTailInstallments` permanecerá visível como indisponível enquanto não existirem parcelas elegíveis, data de liquidação, taxa de desconto, encargos preservados ou dispensados e arredondamento contratual aprovados.

## 9. Comparação de estratégias

A comparação terá sempre dois cenários produzidos a partir do mesmo contrato:

1. **Sem amortização:** `none`, sem aplicar a agenda de aportes.
2. **Com amortização:** mesma agenda aplicada com `reducePayment` ou `reduceTerm`.

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

Para o baseline, economia de juros e meses antecipados são zero. A troca entre `reducePayment` e `reduceTerm` recalcula apenas o cenário com amortização; o baseline permanece idêntico.

## 10. Cronograma e composição financeira

O cronograma mensal segue a ordem definida em `FINANCIAL_MODEL.md` e deve continuar até a quitação. Nenhum limite interno pode truncar silenciosamente os resultados.

Cada período apresentará, quando aplicável:

- número e data do período;
- saldo inicial;
- correção monetária;
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

O total pago e sua composição devem fechar matematicamente, considerando a forma como a correção afeta o saldo e os pagamentos. A classificação econômica da correção permanece uma decisão aberta e não pode ser inferida pela interface.

### 10.2 Visualização

A evolução mensal terá:

- resumo numérico dos dois cenários;
- representação visual do saldo ao longo do tempo;
- tabela completa do cronograma;
- indicação clara do mês e da data de quitação.

A especificação não determina biblioteca, tipo definitivo de gráfico ou estilo visual.

## 11. Persistência local

- Os dados serão salvos automaticamente no dispositivo e perfil de navegador atuais.
- Não haverá conta, sincronização, backend ou envio para serviços externos.
- Devem persistir veículo atual, candidatos, candidato selecionado, formulários em andamento e simulações associadas.
- O usuário terá uma ação explícita para apagar todos os dados locais, acompanhada de confirmação e explicação de irreversibilidade.
- Falhas de leitura ou gravação local devem gerar mensagem compreensível sem apagar silenciosamente os dados em memória.

Exportação, importação e sincronização ficam fora do MVP.

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

- **Sem candidato selecionado:** orientar o retorno à comparação.
- **Financiamento incompleto:** listar os campos necessários e não exibir resultados antigos como atuais.
- **Sem aportes:** permitir calcular `none` e explicar como adicionar uma agenda.
- **Aporte posterior à quitação:** informar que a ocorrência não foi aplicada.
- **Aporte superior ao saldo elegível:** mostrar o valor efetivamente aplicável e exigir tratamento explícito do excedente.
- **Taxa anual sem convenção financeira aprovada:** identificar a dependência do motor financeiro, sem aplicar conversão presumida.
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

### 14.1 MVP

- um veículo atual e múltiplos candidatos;
- ICE, HEV, PHEV e BEV;
- comparação do atual com um candidato;
- TCO de caixa e econômico mensal, anual e por km;
- economia ou custo adicional da troca;
- financiamento PRICE;
- taxa mensal ou anual, sujeita à convenção aprovada do motor;
- custos incorporados ao principal e cobranças periódicas separadas;
- aportes únicos, recorrentes e substituições manuais por período;
- `none`, `reducePayment` e `reduceTerm`;
- comparação baseline versus cenário com amortização;
- cronograma e evolução até a quitação;
- persistência local.

### 14.2 Pós-MVP

- sistema SAC;
- comparação entre dois candidatos;
- múltiplos contratos ou cenários salvos para o mesmo candidato;
- importação e exportação de dados;
- histórico detalhado de abastecimentos e serviços;
- TCO por período de posse;
- curvas de depreciação e valor residual informado;
- inflação e valor do dinheiro no tempo;
- `prepayTailInstallments`, após definição contratual completa.

### 14.3 Fora de escopo

- backend, banco de dados remoto e cloud;
- autenticação e múltiplos usuários;
- APIs externas e atualização automática de preços, FIPE ou índices;
- integração com bancos ou financeiras;
- captura automática de contratos;
- recomendação de crédito, investimento ou decisão financeira;
- reprodução visual do simulador de referência.

## 15. Decisões financeiras abertas

As seguintes decisões bloqueiam partes específicas da implementação e devem ser resolvidas em `FINANCIAL_MODEL.md` antes do respectivo cálculo:

1. convenção de conversão entre taxa anual e mensal;
2. classificação econômica da correção monetária;
3. representação de CET e de encargos contratuais;
4. arredondamento interno ou contratual por prestação;
5. tratamento de valor residual e horizonte de posse;
6. regras de valor presente para `prepayTailInstallments`;
7. composição patrimonial completa da compra e revenda.

Até essas definições serem aprovadas, a interface deve sinalizar a limitação e não criar resultados por aproximação silenciosa.

## 16. Critérios de aceite do MVP

1. O usuário cadastra e edita o veículo atual e candidatos das quatro motorizações.
2. O PHEV distribui a quilometragem sem dupla contagem entre eletricidade e combustível.
3. A comparação apresenta TCO de caixa e econômico separadamente, nas três periodicidades solicitadas.
4. Economia e custo adicional usam direção e rótulos inequívocos.
5. A seleção do candidato alimenta o financiamento sem alterar o TCO operacional.
6. O valor financiado calculado tem precedência; o manual funciona somente como fallback quando o preço não estiver preenchido.
7. O sistema contratual é PRICE e aparece separado da estratégia extraordinária.
8. A taxa exige valor e periodicidade, e sua conversão ocorre somente no motor financeiro segundo regra aprovada.
9. A prestação inicial é calculada e não pode ser digitada como entrada padrão.
10. Custos financiados aumentam o principal; seguros e taxas periódicos apenas aumentam o desembolso dos períodos correspondentes.
11. Um aporte único pode ser agendado em qualquer período válido.
12. Um aporte recorrente respeita início, fim opcional e frequência.
13. `reducePayment` mantém o prazo e reduz a prestação; `reduceTerm` mantém a prestação de referência e reduz o prazo.
14. `prepayTailInstallments` permanece separado e indisponível sem dados contratuais suficientes.
15. A comparação mostra `none` contra uma estratégia com a mesma base contratual.
16. Os resultados incluem valor financiado, prestação inicial, juros, fluxo total, prazos, economia, meses antecipados e saldo mensal.
17. O fluxo total soma prestações, aportes e cobranças periódicas sem contar aportes duas vezes na composição.
18. Principal, juros, correção e encargos aparecem discriminados.
19. O cronograma alcança a quitação ou informa explicitamente por que ela não pôde ser calculada.
20. Os dados permanecem após recarregar o aplicativo e podem ser apagados por ação confirmada.
21. Os cálculos PRICE aplicáveis reconciliam os golden cases de `FINANCIAL_MODEL.md` com as tolerâncias documentadas.
22. Nenhuma tela classifica principal amortizado como custo econômico.