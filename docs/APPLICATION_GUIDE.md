# BuyCar Lab - BR — Guia Funcional da Aplicação

> Especificação funcional do comportamento atual do sistema

> Documento: APPLICATION_GUIDE
>
> Revisão do documento: 1.0.0
>
> Aplicação auditada: 1.1.0
>
> Commit base auditado: 63e48ad
>
> Data da auditoria: 2026-10-11
>
> Status: Vigente

## Governança e autoridade

Este é o documento descritivo/as-built: explica arquitetura, persistência, arquivos, comportamento implementado e limitações reais.

1. `FINANCIAL_MODEL.md` é a autoridade normativa para fórmulas e decisões financeiras.
2. `PRODUCT_SPEC.md` é a autoridade normativa para funcionalidades, jornadas, UX funcional, escopo e roadmap.
3. `APPLICATION_GUIDE.md` registra a implementação observada.
4. Código e testes são evidência da implementação atual.

Quando a implementação divergir de uma regra normativa, este guia deve registrar um gap; não deve presumir que o código revogou a regra. Decisões sem norma suficiente são registradas como abertas, sem inferência.

Este documento descreve o comportamento efetivamente implementado no BuyCar Lab - BR no commit base auditado `63e48ad`, complementado pelos testes automatizados dessa base e sempre sob a governança acima. Alterações não commitadas posteriores não são promovidas a comportamento publicado da v1.1.0.

## 1. Visão geral

O BuyCar Lab - BR é uma aplicação local para comparar o custo de uso e propriedade de veículos e analisar o fluxo de caixa de um financiamento PRICE. O sistema trabalha com um **veículo atual**, usado como referência, e com uma ou mais **opções de troca**.

O produto separa dois conceitos que não podem ser misturados:

- **TCO (Custo Total de Propriedade):** mede custos operacionais anuais normalizados do veículo, com ou sem depreciação.
- **Financiamento:** mede a dívida e seu fluxo de caixa, incluindo prestação, juros, amortização do principal, aportes extraordinários e cobranças.

A aquisição do veículo, a entrada e o principal amortizado não entram automaticamente no TCO. O Ciladômetro combina a economia operacional de TCO com o fluxo real do financiamento apenas para medir o impacto da troca no caixa.

### 1.1 Áreas da aplicação

| Área | Papel funcional |
| --- | --- |
| **01 Veículos** | Cadastra o veículo atual e as opções de troca; apresenta resumos de TCO de caixa. |
| **02 Comparação** | Compara uma ou duas opções contra o veículo atual, incluindo TCO de caixa, TCO econômico e componentes. |
| **03 Financiamento** | Configura um contrato por opção, calcula PRICE, aportes, cobranças e as três estratégias. |
| **04 Ciladômetro** | Integra TCO e cronogramas para comparar o impacto financeiro real de até duas opções. |

## 2. Arquitetura funcional

O fluxo real da aplicação é:

```text
Componentes React em app/src/ui
          ↓ entradas e comandos
Camada de aplicação em app/src/application
          ↓ orquestração e métricas derivadas
Domínio puro em app/src/domain
          ↓ resultados financeiros
Estado React + localStorage
```

### 2.1 Responsabilidades

- **Domínio (`app/src/domain`)**: tipos, validações e fórmulas puras de veículo, TCO e financiamento. Não depende de React.
- **Aplicação (`app/src/application`)**: estado global, persistência, comparação, breakdown, laboratório e Ciladômetro. Consome o domínio e produz estruturas prontas para apresentação.
- **UI (`app/src/ui`)**: formulários, navegação, seleção local, gráficos, tabelas, mensagens e formatação. A UI não refaz fórmulas financeiras.
- **Estado**: `AppStateProvider.tsx` carrega o estado ao iniciar, aplica atualizações imutáveis e tenta persistir cada alteração.
- **Persistência**: `persistence.ts` serializa somente entradas e seleções estáveis. TCO, schedules e métricas derivadas são recalculados.
- **Formatação**: `format.ts` converte valores para a apresentação brasileira e interpreta entradas textuais. A formatação não é fonte de verdade financeira.

`App.tsx` mantém somente a área ativa em memória. A tela de Financiamento é carregada de forma lazy. `main.tsx` resolve o tema antes de renderizar a aplicação e instala o `AppStateProvider`.

## 3. Fluxo principal de uso

1. Cadastrar o **veículo atual** em Veículos.
2. Cadastrar uma ou mais **opções de troca**.
3. Abrir Comparação e selecionar uma ou duas opções.
4. Comparar TCO de caixa, TCO econômico e o breakdown dos custos.
5. Abrir Financiamento e escolher uma opção por vez.
6. Informar compra, taxa, prazo, estratégia salva, aportes e cobranças.
7. Salvar a configuração para calcular as três estratégias.
8. Analisar cards, gráficos, cronograma mensal ou anual e CSV.
9. Abrir o Ciladômetro e selecionar uma ou duas opções.
10. Comparar economia operacional, estratégia recomendada e impacto real no caixa.

### 3.1 Dependências mínimas

- Comparação exige veículo atual e ao menos uma opção.
- Financiamento exige ao menos uma opção; não depende do veículo atual para calcular o contrato.
- Ciladômetro exige veículo atual e opção com TCO calculável.
- A análise financeira completa do Ciladômetro exige financiamento configurado para a opção.
- Uma opção sem financiamento continua mostrando TCO e economia operacional e não bloqueia outra opção financiada.

## 4. Modelo de dados de veículos

O modelo está em `app/src/domain/vehicle.ts`. Todos os veículos possuem:

| Campo | Significado | Unidade |
| --- | --- | --- |
| `name` | Nome informado pelo usuário | texto |
| `powertrain` | Motorização | `ICE`, `HEV`, `PHEV` ou `BEV` |
| `annualMileageKm` | Rodagem anual | km/ano |
| `vehicleValue` | Valor de mercado | R$ |
| `annualDepreciationRate` | Taxa anual de depreciação | decimal de 0 a 1 |
| `annualCosts.insurance` | Seguro anual | R$/ano |
| `annualCosts.propertyTax` | IPVA anual | R$/ano |
| `annualCosts.licensing` | Licenciamento anual | R$/ano |
| `annualCosts.maintenance` | Manutenção anual | R$/ano |

### 4.1 Motorizações

| Motorização | Dados energéticos usados |
| --- | --- |
| **ICE** | Combustível, consumo em km/L ou L/100 km e preço por litro. |
| **HEV** | O mesmo modelo de combustível do ICE, com o consumo próprio do híbrido. Não há entrada elétrica separada. |
| **BEV** | Consumo em kWh/100 km, preço por kWh e taxa de perdas de carregamento. |
| **PHEV** | Combustível e eletricidade separados, mais percentuais elétrico e a combustão. |

Para PHEV, `electricShare + combustionShare` deve ser 1, com tolerância de `1e-12`. Cada percentual precisa estar entre 0 e 1. O custo de cada fonte usa apenas a fração correspondente da quilometragem anual.

Campos energéticos que não pertencem à motorização escolhida não são incluídos no objeto final construído pelo formulário.

## 5. Cadastro e edição de veículos

A tela Veículos mantém no máximo um veículo atual e qualquer quantidade de opções.

### 5.1 Operações

- **Cadastrar veículo atual**: cria o registro de referência com UUID gerado pelo navegador.
- **Editar veículo atual**: substitui os dados do mesmo registro e preserva seu ID.
- **Cadastrar opção**: adiciona uma nova opção com UUID.
- **Editar opção**: substitui os dados da opção preservando seu ID e financiamento associado.
- **Duplicar opção**: cria outra opção com novo ID e os mesmos dados do veículo. O financiamento da origem não é copiado.
- **Excluir opção**: pede confirmação e remove também seu financiamento e qualquer seleção persistida que a referencie.

A UI atual não oferece exclusão isolada do veículo atual; ele pode ser editado. A ação global de limpar dados remove todo o estado.

### 5.2 Usar quilometragem do veículo atual

O controle aparece ao criar ou editar uma opção quando há quilometragem válida no veículo atual.

- Uma nova opção começa com a quilometragem atual copiada e o controle marcado.
- Enquanto marcado, o campo fica somente leitura e é apresentado como herdado.
- Desmarcar permite informar outro valor.
- Ao editar uma opção, o controle começa marcado apenas se sua quilometragem for igual à referência.
- O resultado salvo é apenas um número. Não existe vínculo persistente; alterar depois o veículo atual não atualiza automaticamente opções já salvas.

### 5.3 IPVA automático e manual

Constantes em `app/src/ui/vehicleFormModel.ts`:

```text
SP_PASSENGER_CAR_PROPERTY_TAX_RATE = 0,04
IPVA padrão = valor do veículo × 0,04
```

- Veículo novo começa em modo automático.
- Alterar o valor do veículo recalcula o IPVA enquanto esse modo estiver ativo.
- Digitar no campo do IPVA desativa o automático naquela edição.
- Reativar o controle recalcula a partir do valor atual do veículo.
- Ao abrir um registro existente, o modo é inferido como automático se o valor salvo diferir do padrão em no máximo R$ 0,01; caso contrário, o valor manual é preservado.
- O modo automático em si não é persistido no schema.

### 5.4 Licenciamento automático e manual

O default atual é:

```text
SP_LICENSE_FEE_2026 = 174,08
```

- Veículo novo recebe R$ 174,08 e começa em modo automático.
- Digitar no campo desativa o modo automático.
- Reativar restaura R$ 174,08.
- Registro existente é inferido como automático se o valor estiver a até R$ 0,01 do default; valores diferentes são preservados como manuais.
- O valor é um default específico de SP para 2026, não uma regra temporal permanente.

### 5.5 Entradas monetárias

`CurrencyInput.tsx` usa `type="text"`, `inputMode="decimal"` e prefixo visual `R$` à esquerda. Unidades como `/L` e `/kWh` podem aparecer à direita.

Exemplos de exibição editável:

```text
1000          → 1.000
120000,50     → 120.000,50
R$ 120.000,50 → 120.000,50
```

O componente mantém no máximo duas casas depois da primeira vírgula. O campo vazio permanece vazio. `parseCurrencyInput` devolve `undefined` para vazio; campos obrigatórios processados por `parsePtBrNumber` geram erro. Ao construir o domínio, pontos de milhar são removidos e a vírgula vira ponto decimal. O estado persistido contém números, nunca strings como `R$ 120.000`.

## 6. TCO — Custo Total de Propriedade

As fórmulas estão em `app/src/domain/tco.ts`. O cálculo primeiro valida o veículo e preserva a precisão de `number`; não há arredondamento intermediário intencional.

### 6.1 Combustível

Para consumo em km/L:

```text
litrosAnuais = quilometragemAnual / consumoKmPorLitro
custoCombustivelAnual = litrosAnuais × precoPorLitro
```

Para consumo em L/100 km:

```text
litrosAnuais = quilometragemAnual × consumoLitrosPor100Km / 100
custoCombustivelAnual = litrosAnuais × precoPorLitro
```

ICE e HEV usam a quilometragem anual total. PHEV usa `quilometragemAnual × combustionShare`.

### 6.2 Energia elétrica

```text
energiaBaseKWh = distanciaKm × consumoKWhPor100Km / 100
custoEletricoAnual =
  energiaBaseKWh × precoPorKWh × (1 + taxaDePerdas)
```

BEV usa a quilometragem total. PHEV usa `quilometragemAnual × electricShare`. A taxa de perdas precisa ser não negativa, mas a implementação atual não impõe máximo de 100%.

### 6.3 Depreciação

```text
depreciacaoAnual = valorDoVeiculo × taxaAnualDeDepreciacao
```

A taxa aceita valores de 0 a 1. A depreciação não entra no TCO de caixa e entra integralmente no TCO econômico.

### 6.4 TCO de caixa

```text
TCOCaixaAnual =
  combustivel
  + eletricidade
  + seguro
  + IPVA
  + licenciamento
  + manutencao
```

### 6.5 TCO econômico

Na implementação atual:

```text
TCOEconomicoAnual = TCOCaixaAnual + depreciacaoAnual
```

Juros e outros encargos do financiamento não entram no TCO econômico implementado.

### 6.6 Normalização por período

Para TCO de caixa e econômico:

```text
valorMensal = valorAnual / 12
valorPorKm = valorAnual / quilometragemAnual
```

O TCO é anual normalizado; não há horizonte de posse plurianual nem curva de valor residual.

## 7. Tela Veículos

O veículo atual aparece como referência. Cada card mostra nome, powertrain, TCO de caixa mensal, valor de mercado e quilometragem anual.

## 8. Tela Comparação

A seleção visual aceita uma ou duas opções. A primeira seleção é persistida em `selectedComparisonCandidateId`; uma eventual segunda seleção existe apenas no estado local da tela. Ao entrar sem seleção persistida válida, a primeira opção disponível é selecionada.

Uma tentativa de marcar a terceira opção mantém as duas atuais e mostra erro. A UI também impede ficar sem nenhuma opção.

Cada opção é comparada independentemente contra o mesmo veículo atual.

### 8.1 Resultado operacional

```text
economiaAnual = TCOCaixaAtualAnual - TCOCaixaOpcaoAnual
economiaMensal = TCOCaixaAtualMensal - TCOCaixaOpcaoMensal
diferencaPorKm = TCOCaixaAtualPorKm - TCOCaixaOpcaoPorKm
```

Para TCO de caixa e econômico, a diferença percentual é:

```text
diferencaPercentual = diferencaComSinal / valorAtual × 100
```

Se o valor atual for zero, o percentual é `null` e a interface mostra “Não disponível”. A camada de aplicação também fornece o valor absoluto da diferença.

### 8.2 Breakdown detalhado

`application/tcoBreakdown.ts` produz, em visão mensal ou anual:

- combustível;
- energia elétrica;
- manutenção;
- seguro;
- IPVA;
- licenciamento;
- TCO de caixa;
- depreciação;
- TCO econômico.

Uma fonte não aplicável é exibida como `—`. A direção da diferença é sempre:

```text
diferenca = veiculoAtual - opcao
```

- positivo: economia com a opção;
- negativo: custo adicional com a opção;
- zero: neutro.

Totais recebem tratamento próprio, mas são calculados pelo mesmo domínio de TCO, sem fórmula duplicada no componente.

## 9. Financiamento

A área Financiamento trabalha com **uma opção por vez**. A seleção é persistida em `selectedFinancingCandidateId`, e cada opção pode ter uma configuração em `financingByCandidateId`.

### 9.1 Dados de compra e valor financiado

Se o preço estiver presente:

```text
valorFinanciado = max(
  0,
  preco
  - valorDeTroca
  - entradaAdicional
  + custosFinanciados
)
```

Campos opcionais ausentes valem zero. O valor manual é ignorado quando existe preço válido. Sem preço, `manualAmount` é obrigatório e vira o principal. Para salvar uma simulação PRICE, o resultado precisa ser maior que zero. A camada de aplicação registra se o valor veio do cálculo ou do fallback manual, mas a UI da v1.1.0 não exibe esse rótulo de origem.

### 9.2 Taxas

O usuário informa taxa efetiva em percentual e escolhe periodicidade mensal ou anual. O formulário converte o percentual para decimal.

Taxa mensal:

```text
monthlyRate = rate.value
```

Taxa anual efetiva:

```text
monthlyRate = (1 + annualRate)^(1/12) - 1
```

Não há divisão simples da taxa anual por 12 nem arredondamento intermediário.

### 9.3 Sistema PRICE

Para taxa mensal diferente de zero, a prestação inicial equivale a:

```text
prestacao = principal × taxaMensal
            / (1 - (1 + taxaMensal)^(-prazoMeses))
```

O código usa `Math.log1p` e `Math.expm1` para estabilidade numérica. Para taxa zero:

```text
prestacao = principal / prazoMeses
```

Em cada período:

```text
juros = saldoInicial × taxaMensal
amortizacaoDaParcela = prestacaoContratual - juros
prestacaoContratual = juros + amortizacaoDaParcela
```

A amortização pela parcela é limitada ao saldo. No último período contratual, o principal restante é integralmente amortizado. Pequenos resíduos de ponto flutuante são normalizados segundo uma tolerância relativa baseada em `Number.EPSILON`; saldo negativo não é permitido.

### 9.4 Cronograma mensal

Cada `PriceScheduleEntry` contém:

| Campo | Significado |
| --- | --- |
| `period` | Número do período, iniciando em 1. |
| `openingBalance` | Saldo antes dos juros e pagamentos. |
| `interest` | Juros do período. |
| `contractualPayment` / `payment` | Prestação contratual efetivamente cobrada. |
| `principalAmortizedByPayment` | Principal contido na prestação. |
| `principalAmortizedByExtraPayment` | Principal amortizado pelo aporte aplicado. |
| `extraPaymentApplied` | Alias operacional do aporte efetivamente aplicado. |
| `periodicCharges` | Lista das cobranças aplicadas no período. |
| `periodicChargeTotal` | Soma das cobranças do período. |
| `totalPayment` | Prestação + aporte aplicado + cobranças. |
| `principalAmortized` | Principal da prestação + aporte. |
| `closingBalance` | Saldo depois da amortização total. |

O schedule encerra quando o saldo chega a zero. Se não alcançar quitação, o domínio gera erro em vez de retornar um cronograma parcial válido.

## 10. Amortizações extraordinárias

### 10.1 Aporte único

O formulário permite vários aportes únicos. Cada um tem valor e período. Aportes únicos no mesmo período são somados pelo domínio.

### 10.2 Plano recorrente

A estrutura atual suporta **um único plano recorrente por configuração**, com:

- valor;
- período inicial;
- período final opcional;
- frequência em meses.

Sem período final, o plano segue até a quitação. Uma ocorrência existe quando:

```text
periodo >= inicio
e periodo <= fim, se houver
e (periodo - inicio) % frequencia == 0
```

### 10.3 Substituições manuais

Uma substituição manual troca o valor do plano recorrente somente naquela ocorrência. Ela:

- exige um plano recorrente válido;
- precisa coincidir com início, fim e frequência do plano;
- não pode repetir o mesmo período;
- não altera as demais ocorrências.

### 10.4 Aporte planejado e aplicado

O aporte planejado é obtido pela soma dos aportes únicos do período com a ocorrência recorrente, já considerando eventual substituição. O aporte aplicado é limitado ao saldo elegível **depois da prestação contratual**:

```text
aporteAplicado = min(aportePlanejado, saldoDepoisDaParcela)
```

Excedente não vira custo e não é carregado para outro período. Aportes previstos depois da quitação não aparecem no schedule.

### 10.5 Estratégias

| Estratégia | Comportamento atual |
| --- | --- |
| `none` | Ignora integralmente a agenda de aportes e produz o baseline. Cobranças periódicas continuam aplicáveis. |
| `reducePayment` | Recalcula a prestação usando saldo inicial e períodos restantes. O aporte é aplicado depois da prestação do período, portanto reduz prestações futuras. Em condições normais preserva o prazo; um aporte que quite o saldo pode encerrá-lo antes. |
| `reduceTerm` | Mantém a prestação inicial de referência e usa aportes para reduzir o prazo efetivo. A última prestação pode ser menor para quitar exatamente o saldo. |

### 10.6 Cobranças periódicas

Cada cobrança possui descrição, valor, início, fim opcional e frequência positiva em meses. A regra de ocorrência é a mesma do plano recorrente.

Cobranças:

- entram em `periodicCharges`, `periodicChargeTotal` e `totalPayment`;
- não aumentam o principal;
- não reduzem o saldo;
- não alteram juros ou amortização;
- são somadas uma única vez no total desembolsado.

## 11. Laboratório do Financiamento

`comparePriceStrategies` calcula `none`, `reducePayment` e `reduceTerm` independentemente, usando o mesmo principal, taxa, prazo, agenda e cobranças. A configuração salva escolhe um cenário para outros fluxos, mas não impede a comparação das três estratégias.

### 11.1 Métricas dos cenários

- prestação inicial;
- juros totais;
- economia de juros;
- economia percentual de juros;
- total desembolsado;
- economia de desembolso contra o baseline;
- aportes efetivamente aplicados;
- prazo original e prazo efetivo;
- período de quitação;
- meses antecipados.

```text
economiaJuros = jurosBaseline - jurosCenario
economiaPercentual = economiaJuros / jurosBaseline
economiaDesembolso = desembolsoBaseline - desembolsoCenario
mesesAntecipados = prazoEfetivoBaseline - prazoEfetivoCenario
```

Se os juros do baseline forem zero, a economia percentual é zero. Pequenos resíduos de comparação são normalizados. Economia de desembolso não é presumida igual à economia de juros porque cobranças e cronogramas podem diferir no tempo.

### 11.2 Totais e ausência de dupla contagem

```text
totalPrincipalAmortizado =
  soma(amortizacaoDaParcela + aporteAplicado)

totalDesembolsado = soma(totalPayment)

totalDesembolsado =
  totalPrincipalAmortizado
  + totalJuros
  + totalCobrancasPeriodicas
```

`totalExtraPayments` é um detalhamento da parcela do principal amortizada por aportes. Ele não é somado novamente à última identidade.

### 11.3 Gráficos

O controle local “Estratégia visualizada” escolhe `reducePayment` ou `reduceTerm` sem alterar a estratégia salva. O baseline permanece como referência.

- **Saldo devedor:** saldo final do baseline e da estratégia visualizada.
- **Composição:** juros, amortização da parcela, aporte e cobranças da estratégia visualizada.
- **Prestação:** prestação contratual do baseline e da estratégia visualizada.

`buildFinancingChartData` consome schedules existentes. Não recalcula PRICE na UI e não inventa pontos do cenário depois da quitação.

### 11.4 Tabela e agregação anual

A tabela pode mostrar qualquer uma das três estratégias. A escolha é local e não muda a configuração salva. Há visão mensal e anual, filtro inclusivo por período/ano e scroll localizado.

Cada bloco anual contém até 12 períodos:

- saldo inicial: primeiro saldo inicial do bloco;
- juros: soma;
- prestações: soma;
- amortização da parcela: soma;
- aportes: soma;
- cobranças: soma;
- pagamento total: soma;
- saldo final: último saldo final do bloco.

O último ano pode ter menos de 12 períodos e é agregado normalmente.

### 11.5 CSV

O CSV é gerado no navegador a partir da estratégia, visão e filtro ativos. A exportação usa `Blob`, URL temporária e download via elemento `a`.

- delimitador: ponto e vírgula (`;`);
- linhas: CRLF;
- números: valores internos convertidos para texto, com ponto decimal trocado por vírgula;
- textos: entre aspas, com aspas internas duplicadas;
- cabeçalho usa “Amortização da parcela”;
- nome inclui estratégia e granularidade mensal/anual.

Não existe importação de CSV.

## 12. Ciladômetro

O Ciladômetro integra custo operacional e cronograma financeiro. Ele não é um score e não altera a estratégia salva na tela Financiamento.

### 12.1 Economia operacional e impacto no bolso

```text
economiaOperacionalMensal =
  TCOCaixaMensalAtual - TCOCaixaMensalOpcao

impactoDoPeriodo =
  period.totalPayment - economiaOperacionalMensal
```

`period.totalPayment` já inclui prestação, aporte efetivamente aplicado e cobranças. Portanto nenhum item é somado outra vez.

Interpretação:

- impacto positivo: saída adicional de caixa;
- impacto negativo: economia líquida;
- zero: efeito neutro.

Exemplo protegido por teste:

```text
prestação + aporte = pagamento total = 2.482,42 + 400,00 = 2.882,42
economia operacional = 1.588,37
impacto real = 2.882,42 - 1.588,37 = 1.294,05
```

### 12.2 Métricas do fluxo

Para os períodos existentes no schedule:

```text
mediaDuranteFinanciamento = media(impactosDoSchedule)
maiorImpacto = max(impactos)
menorImpacto = min(impactos)
impactoAposQuitacao = -economiaOperacionalMensal
```

Para um horizonte definido:

```text
pagamentoNoMes = period.totalPayment, se houver período
pagamentoNoMes = 0, após a quitação
impactoTotal = soma(pagamentoNoMes - economiaOperacionalMensal)
impactoMedio = impactoTotal / mesesDoHorizonte
```

Assim, a economia ou o custo operacional continua sendo considerado depois que o financiamento termina.

### 12.3 Estratégia recomendada

Para cada opção financiada, o sistema calcula as três estratégias e usa como horizonte o prazo contratual original daquela opção. A recomendação contém todas as estratégias com o menor `cumulativeCashImpact`, dentro de tolerância numérica relativa baseada em `Number.EPSILON × magnitude × 64`.

Empates são preservados, sem desempate econômico artificial. Para fornecer uma estrutura singular às métricas da UI, `recommendedStrategy` aponta para a primeira estratégia empatada na ordem `none`, `reducePayment`, `reduceTerm`; o conjunto completo permanece em `recommendedStrategies` e é exibido como empate.

### 12.4 Uma ou duas opções

- Com uma opção financiada, o horizonte de comparação é seu prazo original.
- Com duas opções financiadas, o horizonte comum é o maior prazo original entre elas.
- A opção de prazo menor recebe pagamento financeiro zero nos meses restantes, mantendo a diferença operacional.
- Menor impacto total e menor impacto inicial são comparados nesse mesmo horizonte e podem indicar opções diferentes.
- Empates entre veículos são preservados pela mesma tolerância numérica.
- Se qualquer opção selecionada não tiver financiamento, não há horizonte comum nem vencedor financeiro entre as opções. Cada opção financiada ainda mantém sua análise individual no próprio prazo, e a opção sem contrato mantém TCO e economia operacional.

## 13. Persistência

A persistência usa `window.localStorage`.

| Dado | Persistido? | Observação |
| --- | --- | --- |
| Veículo atual e seu ID | Sim | Um registro ou `null`. |
| Opções e IDs | Sim | Lista de registros. |
| Primeira opção da Comparação | Sim | `selectedComparisonCandidateId`. |
| Opção do Financiamento | Sim | `selectedFinancingCandidateId`. |
| Configuração de financiamento por opção | Sim | Compra, taxa, prazo, estratégia, agenda e cobranças. |
| Segunda seleção de Comparação/Ciladômetro | Não | Estado local da tela. |
| Área de navegação ativa | Não | Volta para Veículos ao recarregar. |
| TCO, schedules, juros e métricas | Não | Recalculados a partir das entradas. |
| Tema | Sim, separadamente | Chave própria, fora do schema financeiro. |

### 13.1 Chaves e schema

```text
Dados: mycar:app-state:v1
schemaVersion: 1
Tema: buycar-lab-br:theme
```

O payload principal é `{ schemaVersion, state }`. O carregamento valida estrutura, IDs únicos, seleções, veículos e financiamentos. Financiamento órfão ou inválido torna o estado persistido inválido.

### 13.2 Falhas

- Sem dados: retorna estado inicial vazio.
- Falha de leitura, JSON corrompido, estrutura inválida ou schema desconhecido: o provider inicia estado vazio e mostra erro de persistência; o conteúdo problemático não é apagado automaticamente.
- Falha de gravação: o novo estado permanece em memória durante a sessão e a UI mostra o erro.
- Falha ao limpar: o estado em memória é preservado e o erro é mostrado.
- Limpar todos os dados: exige confirmação, remove a chave principal e reinicia o estado. A preferência de tema não é removida.

## 14. Validações e tratamento de erros

| Área | Regra confirmada | Comportamento em erro |
| --- | --- | --- |
| Veículo | Nome não vazio; powertrain suportado | `DomainValidationError` e mensagem no formulário. |
| Quilometragem | Número finito e maior que zero | Impede salvar/calcular. |
| Valores e custos | Finitos e não negativos | Impede salvar/calcular. Zero é aceito. |
| Depreciação | Entre 0% e 100% | Impede salvar. |
| Consumo | Finito e maior que zero | Impede salvar. |
| Unidade de combustível | `km/L` ou `L/100km` | Rejeita unidade não suportada. |
| Perdas elétricas | Finita e não negativa | Impede salvar se inválida. Não há máximo atual. |
| PHEV | Shares entre 0 e 1 e soma igual a 1 | Impede salvar. |
| Principal PRICE | Finito e maior que zero | Simulação não é criada. |
| Taxa | Finita e não negativa; mensal ou anual | Simulação não é criada. |
| Prazo | Inteiro maior que zero | Simulação não é criada. |
| Períodos/frequências | Inteiros maiores que zero | Agenda/cobrança rejeitada. |
| Fim de agenda | Não pode anteceder início | Agenda/cobrança rejeitada. |
| Substituição | Exige recurring, ocorrência válida e período único | Formulário mostra erro. |
| Cobrança | Descrição não vazia, valor não negativo | Configuração rejeitada. |
| Filtro da tabela | Inteiros positivos; fim não antecede início | Alerta e CSV desabilitado. |
| Multiseleção | Uma ou duas opções | Terceira marcação ou seleção vazia mostra erro. |
| Persistência | Schema e estado válidos | Alerta global; sem exclusão silenciosa. |

Erros de formulário são capturados e exibidos em português. Erros de cálculo nas telas também são convertidos em alertas ou estados vazios; resultados inválidos não são apresentados como válidos.

## 15. Formatação e apresentação

- Moeda final: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
- Números gerais: até duas casas decimais.
- Percentuais: duas casas decimais.
- Custo por km: três casas decimais e `/km`.
- Entradas monetárias: ponto de milhar, vírgula decimal e até duas casas.
- Taxas e percentuais de formulário são exibidos em percentual e convertidos para decimal no domínio.
- Prazos são períodos mensais inteiros; a UI usa “meses”. Não há calendário ou datas contratuais reais.

### 15.1 Precisão e arredondamento

O domínio usa `number` do JavaScript e não arredonda intencionalmente taxa, juros, prestação, principal ou saldo entre períodos. Totais usam valores internos. A interface formata o resultado no final.

Não há `roundingMode: 'halfExpand'` ou helper explícito de arredondamento monetário. A implementação usa o default normativo de `Intl.NumberFormat`, que é `halfExpand`; o runtime auditado confirma empates para longe de zero. Não foi observada divergência de comportamento. A v1.1.0 não possui teste específico para valores exatamente no meio do incremento, portanto existe uma lacuna de teste e garantia explícita, sem bug financeiro comprovado.

## 16. Regras de integração entre telas

```text
VEÍCULOS
  ├─ veículo atual ───────────────┐
  └─ opções ──────────────────┐   │
                              ↓   ↓
COMPARAÇÃO                 TCO atual × TCO de cada opção
  └─ primeira seleção persistida

FINANCIAMENTO
  └─ uma opção por vez → entradas do contrato → três schedules
                                            │
                                            ↓
CILADÔMETRO
  veículo atual + opções + TCO + schedules → impacto real
```

Regras importantes:

- Editar dados de um veículo recalcula TCO e todas as métricas dependentes ao renderizar.
- Editar compra, taxa, prazo, agenda ou cobrança recalcula os três schedules depois de salvar.
- Selecionar estratégia visual em gráfico/tabela não altera a estratégia persistida.
- A estratégia recomendada pelo Ciladômetro é derivada e não altera a configuração salva.
- Excluir uma opção remove seu financiamento e limpa seleções persistidas que apontem para ela.
- O financiamento não modifica o TCO operacional.

## 17. Casos de uso completos

### Caso A — comparar carro atual com elétrico

**Entrada:** veículo atual ICE e opção BEV com energia, tarifa e perdas válidas.
**Caminho:** Veículos → Comparação → selecionar BEV.
**Resultado:** combustível do atual e eletricidade do BEV aparecem separados; economia é TCO de caixa atual menos TCO de caixa do BEV.

### Caso B — comparar duas opções simultaneamente

**Entrada:** veículo atual e ao menos duas opções.
**Caminho:** Comparação → marcar duas opções.
**Resultado:** cada opção é comparada independentemente contra a referência; a terceira opção é bloqueada enquanto duas estiverem marcadas.

### Caso C — financiar sem aporte

**Entrada:** compra ou principal manual, taxa, prazo, sem agenda.
**Caminho:** Financiamento → salvar.
**Resultado:** as três estratégias produzem schedules equivalentes e economia de aportes zero; cobranças, se houver, ainda entram no fluxo.

### Caso D — financiar com aporte recorrente

**Entrada:** valor, início, frequência e fim opcional.
**Caminho:** Planos de amortização → ativar recorrente → salvar.
**Resultado:** ocorrências elegíveis são aplicadas até quitação; `reducePayment` reduz prestações futuras e `reduceTerm` reduz prazo.

### Caso E — financiar com aporte único

**Entrada:** valor e parcela do aporte.
**Caminho:** adicionar amortização única → salvar.
**Resultado:** somente o período indicado recebe o aporte, limitado ao saldo depois da prestação.

### Caso F — `reducePayment`

**Entrada:** contrato com agenda e estratégia salva “Reduzir parcela”.
**Resultado:** a prestação do período é calculada antes do aporte; períodos futuros usam o saldo reduzido e prazo remanescente.

### Caso G — `reduceTerm`

**Entrada:** contrato com agenda e estratégia “Reduzir prazo”.
**Resultado:** a prestação de referência permanece até a última cobrança necessária e o schedule termina ao quitar.

### Caso H — opção sem financiamento no Ciladômetro

**Entrada:** duas opções, apenas uma financiada.
**Resultado:** ambas mostram custo operacional; a financiada mantém análise no próprio prazo; a outra solicita configuração; não há vencedor financeiro entre opções nem horizonte comum fictício.

## 18. Limitações atuais

- Somente sistema PRICE; SAC não existe.
- `prepayTailInstallments` não existe.
- Um único plano recorrente por financiamento, embora vários aportes únicos sejam permitidos.
- Um contrato salvo por opção, sem versões ou cenários persistidos paralelos.
- Sem correção monetária, CET, taxa nominal, IOF detalhado ou calendário contratual real.
- Períodos são índices mensais, sem datas, feriados ou vencimentos.
- Sem backend, banco remoto, login, usuários ou sincronização entre dispositivos.
- Sem APIs externas, FIPE automática, preços de energia/combustível ou legislação atualizada.
- Sem histórico de abastecimentos, serviços ou importação de planilhas/CSV.
- TCO anual simples, sem horizonte de posse, inflação, valor do dinheiro no tempo, curva de depreciação ou valor residual.
- HEV é modelado apenas como veículo a combustível mais eficiente; não há fluxo elétrico externo.
- PHEV divide a quilometragem por percentuais fixos, sem modelagem por viagem, autonomia ou recarga.
- IPVA de 4% e licenciamento de R$ 174,08 são defaults editáveis de SP, não consulta fiscal.
- Resultados são simulações e não propostas bancárias ou recomendação financeira.

### 18.1 Pontos encontrados durante a documentação

- Documentos antigos descrevem TCO econômico de forma ampla, podendo incluir encargos financeiros. O código do commit base auditado inclui somente TCO de caixa e depreciação.
- A regra normativa declara arredondamento visual `halfExpand`; o código do commit base delega a exibição ao default compatível de `Intl.NumberFormat`. Falta teste específico de empate e modo explícito, mas não há divergência de comportamento observada.
- A camada financeira distingue valor financiado calculado e fallback manual, mas a UI da v1.1.0 não apresenta essa origem ao usuário; o requisito permanece registrado como gap funcional em `PRODUCT_SPEC.md`.
- `FINANCIAL_MODEL.md` contém extensa descrição da planilha de referência e funcionalidades futuras. Essas seções não representam automaticamente a aplicação atual.
- Em empate de estratégias, o conjunto completo é preservado, mas métricas singulares usam a primeira estratégia na ordem canônica. Esse comportamento é confirmado pelo código; não há uma estratégia singular economicamente vencedora nesse caso.

## 19. Regras invariantes do sistema

Futuras alterações não devem quebrar estas regras confirmadas:

1. TCO operacional e fluxo do financiamento são calculados separadamente.
2. Compra, entrada e principal não entram automaticamente no TCO.
3. O TCO econômico atual é TCO de caixa mais depreciação.
4. O veículo atual é a referência de Comparação e Ciladômetro.
5. Diferenças de TCO seguem `atual - opção`.
6. Financiamento opera sobre uma opção por vez e não altera seu TCO.
7. O valor financiado calculado tem precedência sobre o manual.
8. Taxa anual efetiva é convertida por equivalência composta.
9. A prestação PRICE é juros mais amortização da parcela.
10. O schedule é a fonte de verdade para pagamentos, aportes e cobranças.
11. Aporte aplicado não excede o saldo depois da prestação.
12. Cobrança periódica aumenta caixa, mas não amortiza principal.
13. Aportes são detalhamento do principal e não podem ser contados duas vezes.
14. `reducePayment` afeta prestações futuras; `reduceTerm` preserva a prestação de referência enquanto houver saldo suficiente.
15. Cálculos financeiros ficam fora dos componentes React.
16. TCO, schedules e métricas de decisão são derivados e não persistidos.
17. O impacto do Ciladômetro usa `totalPayment - economia operacional`.
18. Comparações entre opções financiadas usam um horizonte comum.
19. Empates de estratégia ou veículo não recebem desempate arbitrário.
20. A precisão interna é preservada e a formatação ocorre na apresentação.

## 20. Mapa dos principais arquivos

| Arquivo / pasta | Responsabilidade |
| --- | --- |
| `app/src/domain/vehicle.ts` | Tipos e validação de ICE, HEV, PHEV e BEV. |
| `app/src/domain/tco.ts` | Combustível, eletricidade, depreciação, TCO e economia operacional. |
| `app/src/domain/financing.ts` | Valor financiado, taxa efetiva, PRICE, aportes, cobranças e estratégias. |
| `app/src/application/appState.ts` | Modelo do estado, operações, comparação integrada e financiamento por opção. |
| `app/src/application/AppStateProvider.tsx` | Estado React, carregamento, atualização, erros e limpeza. |
| `app/src/application/persistence.ts` | Schema local, serialização, validação e falhas de storage. |
| `app/src/application/financingLab.ts` | Impactos, agregação anual, filtros, gráficos e CSV. |
| `app/src/application/decisionDashboard.ts` | Fluxo real, recomendação, horizontes e comparação do Ciladômetro. |
| `app/src/application/tcoBreakdown.ts` | Breakdown puro e comparação de componentes. |
| `app/src/application/multiVehicleSelection.ts` | Seleção de até duas opções e reconciliação. |
| `app/src/application/vehicleSummary.ts` | Cálculo do resumo exibido nos cards de veículos. |
| `app/src/application/themePreference.ts` | Tema claro/escuro e preferência separada. |
| `app/src/ui/vehicleFormModel.ts` | Estado do formulário, defaults de SP e construção do veículo. |
| `app/src/ui/financingFormModel.ts` | Conversão entre formulário e configuração financeira. |
| `app/src/ui/CurrencyInput.tsx` e `format.ts` | Entrada monetária e formatação final. |
| `app/src/ui/VehiclesScreen.tsx` | Garagem, edição, duplicação e exclusão. |
| `app/src/ui/ComparisonScreen.tsx` | Dashboard comparativo. |
| `app/src/ui/TcoBreakdownTable.tsx` | Tabela detalhada mensal/anual. |
| `app/src/ui/FinancingScreen.tsx` | Seleção e orquestração do financiamento. |
| `app/src/ui/FinancingForm.tsx` | Compra, contrato, aportes e cobranças. |
| `app/src/ui/FinancingResults.tsx` | Resumo e comparação das estratégias. |
| `app/src/ui/FinancingLab.tsx` | Gráficos, tabela, filtros e download CSV. |
| `app/src/ui/DecisionDashboardScreen.tsx` | Apresentação do Ciladômetro. |
| `app/src/ui/AppShell.tsx` | Navegação, tema, versão, limpeza e alerta de persistência. |
| `app/src/App.tsx` | Navegação entre as quatro áreas e lazy loading. |
| `app/src/main.tsx` | Inicialização de tema, React e provider. |
| `app/src/**/*.test.ts` | Casos de regressão do domínio, aplicação e modelos de formulário. |

## 21. Glossário

| Termo | Definição no sistema |
| --- | --- |
| **TCO de caixa** | Combustível, eletricidade, manutenção, seguro, IPVA e licenciamento. |
| **TCO econômico** | TCO de caixa mais depreciação anual. |
| **Veículo atual** | Referência única contra a qual opções são comparadas. |
| **Opção de troca** | Veículo avaliado para uma possível compra e financiamento. |
| **Principal** | Valor financiado sujeito ao contrato. |
| **Prestação** | Juros do período mais principal amortizado pela parcela. |
| **Amortização da parcela** | Parte da prestação que reduz o principal. |
| **Aporte** | Amortização extraordinária do principal. |
| **Aporte aplicado** | Parte do aporte planejado que cabe no saldo elegível. |
| **Cobrança periódica** | Saída adicional do período que não reduz dívida. |
| **Saldo devedor** | Principal ainda não amortizado. |
| **PRICE** | Sistema de prestação calculada por taxa e prazo, com juros sobre o saldo. |
| **`none`** | Cenário sem amortização extraordinária. |
| **`reducePayment`** | Estratégia que recalcula prestações futuras após aportes. |
| **`reduceTerm`** | Estratégia que mantém a prestação de referência e antecipa quitação. |
| **Economia operacional** | TCO de caixa do atual menos TCO de caixa da opção. |
| **Impacto no bolso** | Pagamento financeiro real menos economia operacional. |
| **Prazo original** | Número de meses contratado. |
| **Prazo efetivo** | Quantidade de entradas existentes no schedule até a quitação. |
| **Quitação** | Período em que o saldo chega exatamente a zero. |
| **Total desembolsado** | Soma dos pagamentos totais do schedule. |
| **Horizonte comum** | Maior prazo original entre opções financiadas selecionadas. |

## Histórico de revisões

| Revisão | Aplicação auditada | Data | Alterações |
| --- | --- | --- | --- |
| 1.0.0 | 1.1.0 (`63e48ad`) | 2026-10-11 | Início da governança formal; hierarquia de autoridade e metadados; delimitação entre a base v1.1.0 e o working tree posterior; classificação da lacuna de teste de arredondamento alinhada aos documentos normativos. |
