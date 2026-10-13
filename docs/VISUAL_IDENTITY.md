# BuyCar Lab - BR — identidade visual

> Registro do visual implementado em 2026-10-12. A opção 01 — Estrada B foi aprovada para a marca da sidebar e o ícone da aba na v1.2.0.
>
> Fonte de verdade dos valores em produção: `app/src/styles/tokens.css`, com composição em `app/src/app.css`. Este documento explica o uso dos tokens; se o CSS mudar, conferir e atualizar este registro.

## Essência da marca

**Nome:** BuyCar Lab - BR. **Assinatura atual:** “É cilada ou não?”. O produto ajuda a comparar veículos, custo de uso e financiamento para tornar a decisão de troca compreensível. A interface deve transmitir clareza, precisão e confiança, com densidade útil e pouco ruído visual.

O azul é a cor de identidade, ações e seleção. As demais cores têm significado dentro das análises e não são variações livres da marca. Ícones acompanham texto; valores e rótulos explicam o que a cor sinaliza.

## Paleta em uso

| Papel | Token | Claro | Escuro | Uso |
| --- | --- | --- | --- | --- |
| Marca e ação | `--color-primary` | `#2563d6` | `#6ea8ff` | Links, ações e estados selecionados |
| Referência | `--reference` | `#6b46d8` | `#b79cff` | Veículo atual e contexto de comparação |
| Economia | `--success` | `#0b7a4f` | `#4ade9a` | Economia e menor custo operacional |
| Decisão financeira | `--decision-text` | `#8a5a00` | `#e7b84b` | Vencedor financeiro único e válido no Ciladômetro |
| Dourado de apoio | `--accent` | `#d7a52d` | `#f0c04f` | Superfícies e detalhes da decisão financeira |
| Alerta e custo | `--danger` | `#c2331f` | `#ff8a7a` | Erros, exclusão e custo adicional |

O dourado não significa “melhor carro” em geral. Ele destaca somente o menor impacto financeiro acumulado válido no horizonte comum, quando não há empate. O verde permanece ligado ao custo de uso e à economia operacional. O violeta identifica a referência.

### Superfícies, texto e estrutura

| Papel | Token | Claro | Escuro |
| --- | --- | --- | --- |
| Fundo da aplicação | `--app-background` | `#eef2f6` | `#0e1117` |
| Card | `--surface` | `#ffffff` | `#161b24` |
| Superfície secundária | `--surface-soft` | `#f1f4f8` | `#1b222d` |
| Texto principal | `--color-text` | `#12161d` | `#e8ecf2` |
| Texto secundário | `--muted` | `#505c70` | `#a2acbc` |
| Bordas de seção | `--line` | `#ccd5e1` | `#252c38` |
| Bordas de controle | `--control-border` | `#b7c5d5` | `#374557` |
| Fundo de controle | `--control-background` | `#ffffff` | `#10151d` |

No tema claro, a distinção entre fundo, card e controle depende das bordas e dos contrastes acima. No escuro, manter superfícies escalonadas e texto legível, sem usar brilho azul em toda a página. Para novos componentes, usar os tokens sem copiar cores hexadecimais diretamente.

## Tipografia e proporções

- Família: `Segoe UI`, `ui-sans-serif`, `system-ui`, `sans-serif`. A interface usa fonte local do sistema, sem download.
- Título de página: `--type-page`, de `1.65rem` a `2.25rem` conforme a largura.
- Título de seção: `--type-section`, de `1.2rem` a `1.4rem`; título de card: `--type-card`, `1.1rem`.
- Corpo: `--type-body`, `0.95rem`; label: `--type-label`, `0.85rem`; legenda: `--type-caption`, `0.78rem`.
- Valor financeiro principal: `--type-financial`, de `1.65rem` a `2.1rem`. Usar dígitos tabulares e manter unidade e contexto próximos do número.

A hierarquia vem primeiro do agrupamento, do peso e da proximidade entre título, valor e explicação. Antes de reduzir fontes, ajustar padding e gaps. Texto auxiliar fica apenas quando esclarece uma regra ou leitura que o layout não comunica sozinho.

## Espaçamento, formas e componentes

| Padrão | Tokens e valor atual |
| --- | --- |
| Escala de espaçamento | `--space-xs` 4 px; `--space-sm` 8 px; `--space-md` 12 px; `--space-lg` 20 px; `--space-xl` 28 px |
| Intervalo entre seções | `--space-section`: `clamp(20px, 2.2vw, 28px)` |
| Padding | `--card-padding` 20 px; `--panel-padding` 22 px |
| Controle | `--control-height` 44 px |
| Raios | `--radius-sm` 10 px; `--radius-md` 12 px; `--radius-lg` e `--radius-xl` 16 px |
| Profundidade | `--shadow-sm`, `--shadow`, `--shadow-lg`, com valores próprios por tema |

Cards têm borda perceptível, raio moderado e sombra contida. Seletores de veículos compartilham cartões retangulares, altura e alinhamento; estados ativos não deslocam texto. Financiamento mantém semântica radio, e Comparação/Ciladômetro mantêm seleção múltipla com limite informado. Em telas estreitas, os conjuntos empilham sem comprimir nomes; tabelas largas rolam dentro da própria seção.

## Iconografia e acessibilidade

Lucide é a biblioteca de ícones da interface. `AppIcon` padroniza `strokeWidth={1.75}`. Usar 24 px na navegação, 20 px em cards e seções e 16 px em linhas compactas, tabelas e botões pequenos. A navegação usa `CarFront`, `GitCompareArrows`, `Landmark` e `Gauge` para Garagem, Comparação, Financiamento e Ciladômetro. Sol e lua ficam no rodapé lateral para alternar o tema.

Ícone nunca substitui rótulo. Ações representadas apenas por ícone precisam de nome acessível; controles precisam de foco visível, texto legível nos dois temas e navegação por teclado. Cor não deve ser a única pista para seleção, vencedor, referência, economia ou erro.

## Logo escolhido

O logo aprovado é o conceito **Estrada B**: a letra B construída como via, sugerindo carro e percurso de decisão. O arquivo usado pelo aplicativo está em [`app/public/brand/logo-estrada-b.png`](../app/public/brand/logo-estrada-b.png), na sidebar e no favicon, substituindo a marca provisória “BL”. O nome “BuyCar Lab - BR” permanece como texto ao lado do símbolo. Os candidatos descartados não fazem parte do repositório público.

**Evolução possível:** se a marca exigir novas aplicações, normalizar a cor do raster aos tokens e preparar uma versão vetorial final numa rodada posterior. A miniatura atual foi ajustada para mostrar o “B” inteiro em claro/escuro e desktop/mobile.

## Fontes e governança

Este guia registra a identidade visual e a escolha do logo; não muda comportamento do produto. `FINANCIAL_MODEL.md` permanece aplicável sem edição. `PRODUCT_SPEC.md` e `APPLICATION_GUIDE.md` não precisam de revisão porque nenhuma função, regra ou nomenclatura da interface foi alterada nesta entrega.
