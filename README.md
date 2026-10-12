# BuyCar Lab - BR

**Versão oficial: v1.2.0.** [Abrir o aplicativo](https://buy-car-lab-br.vercel.app/).

Aplicativo para comparar o custo total de propriedade de veículos e analisar contratos de financiamento PRICE. Ele funciona no navegador, mantém os dados no armazenamento local desse navegador e não exige conta. Pode ser usado pelo site publicado ou executado localmente.

## O que o aplicativo oferece

- Cadastro de veículo atual e opções de troca ICE, HEV, PHEV e BEV.
- Comparação simultânea de até quatro opções pelo TCO de caixa e pelo TCO econômico.
- Laboratório de financiamento PRICE com três estratégias de amortização.
- Aportes únicos, plano recorrente, exceções e cobranças periódicas.
- Gráficos, tabela de amortização mensal ou anual, filtros e exportação CSV.
- Ciladômetro para comparar o impacto financeiro real de até quatro opções de troca.
- Modos claro e escuro.
- Interface responsiva com identidade visual própria, ícones Lucide e logo Estrada B.
- Persistência automática no `localStorage` do navegador.

## Site publicado e dados

O [site oficial](https://buy-car-lab-br.vercel.app/) está hospedado no Vercel. O Vercel entrega os arquivos da aplicação; veículos, financiamentos e preferência de tema são salvos pelo próprio navegador. Eles não são enviados a uma conta nem sincronizados com outros dispositivos.

O endereço `localhost:5173` e o domínio `buy-car-lab-br.vercel.app` têm armazenamentos locais separados. Por isso, os veículos cadastrados no desenvolvimento local não aparecem automaticamente no site publicado. No mesmo navegador e no mesmo domínio publicado, uma atualização da aplicação normalmente preserva os dados locais; usar outro navegador, perfil, dispositivo ou domínio de deployment abre um armazenamento diferente. Limpar os dados do site no navegador também remove os registros locais.

O repositório está conectado ao Vercel com `main` como branch de produção. Um **push de novo commit para `main`** inicia um novo build e, se ele for bem-sucedido, atualiza o domínio de produção automaticamente. Um commit que permaneça apenas no computador não atualiza o site. Criar uma tag ou uma GitHub Release, por si só, também não muda o deployment de produção.

## Como instalar

### Requisitos

Instale o [Node.js](https://nodejs.org/) em uma versão compatível com o projeto: `20.19` ou superior, ou `22.12` ou superior. O `npm` é instalado junto com o Node.js.

### 1. Baixe o projeto

Na página do repositório, clique em **Code** e depois em **Download ZIP**. Extraia o arquivo em uma pasta de sua preferência.

Também é possível usar Git:

```sh
git clone https://github.com/natpxt/BuyCar-Lab-BR.git
cd BuyCar-Lab-BR
```

### 2. Abra o terminal na pasta do projeto

No Windows, abra a pasta extraída, clique com o botão direito em uma área vazia e escolha **Abrir no Terminal**.

Entre na pasta da aplicação:

```sh
cd app
```

### 3. Instale as dependências

```sh
npm install
```

Esse comando precisa ser executado apenas na primeira instalação ou quando as dependências forem atualizadas.

### 4. Inicie o aplicativo

```sh
npm run dev
```

O terminal mostrará um endereço local, normalmente:

```text
http://localhost:5173/
```

Abra esse endereço no navegador. Mantenha o terminal aberto enquanto estiver usando o aplicativo. Para encerrar, volte ao terminal e pressione `Ctrl + C`.

## Como usar

O fluxo recomendado é seguir as quatro áreas do menu lateral.

### 01 — Veículos

1. Na **Garagem**, clique em **Cadastrar veículo atual** e informe os dados do carro que você possui hoje.
2. Use **Adicionar opção** para cadastrar os veículos que considera comprar.
3. Escolha a motorização correta: combustão, híbrido, híbrido plug-in ou elétrico.
4. Preencha quilometragem, valor, depreciação, seguro, manutenção e os custos de combustível ou energia aplicáveis.
5. Revise o IPVA estimado automaticamente em 4% do valor do veículo para São Paulo e o licenciamento padrão de São Paulo de 2026. Ambos podem ser editados manualmente.

Os cards permitem editar, duplicar e excluir opções. O custo mensal exibido usa o TCO de caixa calculado com os dados informados.

### 02 — Comparação

1. Selecione de uma a quatro opções de troca.
2. Leia o resultado operacional de cada veículo em relação ao veículo atual.
3. Compare TCO de caixa, TCO econômico e custo por quilômetro.
4. Use **Mensal** ou **Anual** na comparação detalhada para analisar combustível, energia elétrica, manutenção, seguro, IPVA, licenciamento e depreciação.

Na coluna **Diferença**, um valor positivo representa economia com a opção de troca. Um valor negativo representa custo adicional.

### 03 — Financiamento

1. Escolha o **Veículo a financiar**.
2. Informe preço, valor de troca, entrada adicional e custos financiados. Se necessário, utilize o valor financiado manual.
3. Configure taxa efetiva, periodicidade e prazo do contrato PRICE.
4. Escolha a estratégia que será salva para o veículo:
   - **Sem amortização extraordinária**;
   - **Reduzir parcela**;
   - **Reduzir prazo**.
5. Em **Planos de amortização**, adicione aportes únicos ou um plano recorrente. As exceções permitem substituir o valor de ocorrências específicas do plano recorrente.
6. Em **Cobranças periódicas**, registre seguros, tarifas ou outras cobranças que saem do caixa sem reduzir a dívida.
7. Clique em **Salvar e calcular financiamento**.

O laboratório apresenta as três estratégias lado a lado, com prestação inicial, juros, economia, total desembolsado, aportes e prazo efetivo. Os gráficos reutilizam os cronogramas calculados para mostrar saldo devedor, composição dos pagamentos e evolução da prestação.

Na **Tabela de amortização**, escolha a estratégia, alterne entre visão mensal e anual, filtre os períodos e use **Baixar CSV** para exportar exatamente os dados exibidos.

### 04 — Ciladômetro

1. Selecione de uma a quatro opções de troca.
2. O aplicativo compara cada opção com o veículo atual e calcula as três estratégias financeiras internamente.
3. Para cada veículo, o Ciladômetro recomenda a estratégia com menor impacto total no bolso durante o horizonte do contrato, preservando empates.
4. Compare impacto no primeiro mês, impacto médio, impacto total, economia operacional, custo após a quitação e fluxo real do financiamento.

A métrica de impacto usa os pagamentos efetivamente aplicados no cronograma, incluindo aportes e cobranças nos períodos corretos. O Ciladômetro não produz uma nota arbitrária e não substitui critérios pessoais ou não financeiros.

Se uma opção ainda não tiver financiamento configurado, seus dados de TCO continuam disponíveis e a tela orienta a concluir a configuração na área **Financiamento**.

## Preferências e dados locais

- Use o controle no rodapé da navegação para alternar entre os modos claro e escuro.
- Veículos e financiamentos são salvos automaticamente no navegador.
- Os dados não são sincronizados entre navegadores, domínios ou computadores.
- O tema visual é salvo separadamente dos dados financeiros.
- O botão **Limpar todos os dados** remove os veículos e as simulações armazenados no navegador.

## Atualizar uma instalação existente

Abra o terminal na pasta do projeto e execute:

```sh
git pull
cd app
npm install
npm run dev
```

Se você baixou um arquivo ZIP, baixe a versão mais recente e extraia-a em uma nova pasta. Os dados existentes permanecem no navegador quando a aplicação continua sendo acessada pela mesma origem local.

## Premissas e limitações

O aplicativo não possui backend, conta, sincronização entre dispositivos ou consulta a APIs externas. Os resultados dependem das entradas fornecidas e não constituem recomendação financeira.

TCO de caixa, TCO econômico e fluxo do financiamento são conceitos separados. O principal amortizado reduz a dívida e não é tratado como custo econômico.

Consulte [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) e [docs/FINANCIAL_MODEL.md](docs/FINANCIAL_MODEL.md) para as regras e premissas detalhadas.
