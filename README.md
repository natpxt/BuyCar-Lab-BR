# BuyCar Lab - BR

Aplicativo pessoal e local para comparar o custo total de propriedade de veículos e analisar contratos de financiamento PRICE.

## Áreas do aplicativo

- **Veículos:** mantém um veículo atual e opções de troca ICE, HEV, PHEV ou BEV. Os cards mostram quilometragem anual, TCO de caixa mensal e valor de mercado.
- **Comparação:** compara uma ou duas opções simultaneamente contra o veículo atual, com TCO de caixa, TCO econômico e detalhamento dos custos.
- **Financiamento:** simula um veículo por vez, com contrato PRICE, aportes, cobranças, estratégias `none`, `reducePayment` e `reduceTerm`, gráficos, tabela mensal/anual e CSV.
- **Ciladômetro:** integra TCO e o fluxo real dos cronogramas de até duas opções, sem produzir um score arbitrário.

Os dados ficam no `localStorage` do navegador. Resultados financeiros e cronogramas são recalculados a partir das entradas persistidas.

## Desenvolvimento

```sh
cd app
npm install
npm run dev
```

## Validação

```sh
cd app
npm test
npm run build
```

## Limites atuais

O aplicativo não possui backend, conta, sincronização entre dispositivos ou consulta a APIs externas. SAC, `prepayTailInstallments`, múltiplos planos recorrentes independentes e análise por horizonte de posse permanecem fora da v1.

O roadmap pós-v1 inclui hospedagem gratuita, PWA, login, Supabase, sincronização entre dispositivos e as funcionalidades financeiras ainda não definidas contratualmente.

Consulte [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) e [docs/FINANCIAL_MODEL.md](docs/FINANCIAL_MODEL.md) para regras e premissas.
