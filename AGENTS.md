# Repository Guidelines

## Idioma e finalidade do produto

Use português do Brasil nas interações, na documentação e nos textos da interface. Use inglês para nomes de variáveis, funções, tipos, componentes e arquivos de código.

O produto é um aplicativo pessoal para comparar TCO e financiamento de veículos ICE, HEV, PHEV e BEV. A v1.x funciona localmente. Não adicione backend, cloud, Supabase, autenticação ou APIs externas sem necessidade aprovada. Evite overengineering e implemente apenas o escopo solicitado.

## Estrutura do projeto

Há um único repositório Git e uma aplicação React, TypeScript e Vite em `app/`. O código fica em `app/src/`; mantenha arquivos específicos próximos ao componente. Use `docs/` para documentação e `reference/` para pesquisas. Não versione `app/dist/` nem `app/node_modules/`.

Separe rigorosamente lógica financeira e interface. Fórmulas de TCO, financiamento e amortização devem ficar em módulos TypeScript próprios, fora dos componentes React. Componentes recebem resultados e cuidam da apresentação.

## Comandos de desenvolvimento

Execute os comandos dentro de `app/`:

- `npm install`: instala as dependências registradas.
- `npm run dev`: inicia o Vite localmente.
- `npm run build`: verifica o TypeScript e gera `app/dist/`.
- `npm run preview`: serve o build localmente.

Após qualquer alteração de código, execute `npm run build`. Antes de adicionar uma dependência, explique por que ela é necessária e por que os recursos existentes não bastam.

## Estilo e nomenclatura

Use TypeScript e componentes funcionais. Adote dois espaços, aspas simples e sem ponto e vírgula. Use PascalCase para componentes e arquivos (`VehicleCard.tsx`), camelCase para funções e variáveis e kebab-case no CSS. Prefira tipos explícitos entre módulos. Não há formatter ou linter; justifique qualquer inclusão.

## Regras financeiras e testes

Diferencie TCO de caixa, TCO econômico e fluxo de caixa do financiamento no código e na interface. Principal amortizado reduz dívida e não é custo econômico. Documente premissas, unidades, períodos e arredondamentos junto às fórmulas.

Alterações financeiras devem ser pequenas e verificáveis. Preserve as funções puras e os testes automatizados existentes; ao adicionar testes, coloque-os junto ao módulo correspondente (`financing.test.ts`, por exemplo). Execute `npm test` e reconcilie exemplos conhecidos após mudanças financeiras.

## Commits e pull requests

Use mensagens imperativas, opcionalmente com Conventional Commits, como `feat: add vehicle comparison form`. Mantenha commits focados. Pull requests devem explicar a motivação, listar validações, vincular referências e incluir capturas para mudanças visuais. Destaque novas dependências, configurações e premissas financeiras.

## Governança documental

Toda alteração funcional, financeira, de persistência ou de arquitetura deve avaliar obrigatoriamente `docs/FINANCIAL_MODEL.md`, `docs/PRODUCT_SPEC.md` e `docs/APPLICATION_GUIDE.md`.

- Mudança de fórmula ou regra financeira: atualizar `FINANCIAL_MODEL.md` antes da implementação.
- Mudança funcional ou de produto: atualizar `PRODUCT_SPEC.md`.
- Após implementar uma mudança de comportamento: atualizar `APPLICATION_GUIDE.md` para refletir o comportamento real.
- Se um documento não precisar mudar, registrar essa conclusão no relatório final.

Cada documento possui revisão própria, independente da versão do aplicativo. Divergências devem ser classificadas como documentação desatualizada, gap de implementação ou decisão aberta e registradas explicitamente; não as corrija silenciosamente escolhendo uma fonte sem aplicar a hierarquia documental.

Nenhuma feature é considerada concluída sem essa verificação.
