# BuyCar Lab - BR

**Versão oficial: v1.4.0.** [Abrir o aplicativo](https://buy-car-lab-br.vercel.app/).

Aplicativo para comparar o custo total de propriedade de veículos e analisar financiamentos PRICE. O uso principal é pelo site, sem instalação. Você pode criar uma conta para guardar e sincronizar sua garagem ou continuar sem conta, com dados apenas neste navegador.

**Cadastro em fase inicial:** o envio padrão do Supabase confirma emails de endereços autorizados na equipe do projeto. Enquanto não houver SMTP próprio, outras pessoas podem usar o aplicativo sem login, mas podem não conseguir confirmar uma conta. [Entenda a limitação](https://supabase.com/docs/guides/auth/auth-smtp).

## O que o aplicativo oferece

- Garagem com veículo atual e opções de troca a combustão (ICE), híbridas (HEV e PHEV) e elétricas (BEV).
- Comparação de até quatro opções por TCO de caixa, TCO econômico e custo por quilômetro.
- Laboratório de financiamento PRICE, aportes, cobranças e três estratégias de amortização.
- Ciladômetro para comparar o impacto financeiro da troca.
- Gráficos, tabela de amortização, filtros e exportação CSV.
- Modos claro e escuro, cadastro de conta com foto opcional e uso sem login.

## Como usar

### Acesse o site e escolha como guardar os dados

Abra [buy-car-lab-br.vercel.app](https://buy-car-lab-br.vercel.app/). No menu **Entrar**, você pode criar uma conta com nome, email e senha, confirmar o email recebido e fazer login. A garagem da conta é salva no Supabase e pode ser carregada em outros dispositivos ao entrar com a mesma conta.

Nesta etapa, a confirmação por email está limitada aos endereços autorizados no projeto Supabase. O cadastro público será liberado após configurar um serviço SMTP próprio.

Você também pode usar todas as áreas sem fazer login. Nesse caso, veículos e financiamentos ficam no armazenamento local do navegador e podem desaparecer se os dados do site forem apagados. Eles não aparecem automaticamente em outro navegador ou dispositivo.

Se você já usava o aplicativo sem conta **nesse mesmo navegador e endereço**, o primeiro login oferece importar a garagem local. A importação é opcional; a cópia local é preservada. Se a conta já tiver uma garagem, o aplicativo pede confirmação antes de substituí-la. A opção de importar também fica no menu da conta.

No menu da conta, **Configurações da conta** mostra nome, email e foto. Clique em **Alterar dados** para editar o perfil, trocar a foto ou criar nova senha. A foto escolhida aparece como prévia; as mudanças só são enviadas após **Salvar alterações** e a confirmação no diálogo. A alteração de email pode exigir confirmação por mensagem. A foto escolhida no cadastro é enviada após confirmar o email e entrar no mesmo navegador; em outro dispositivo, você pode adicioná-la nas configurações.

### 01 — Garagem

Cadastre o veículo atual e as opções de troca. Escolha a motorização e preencha valor, quilometragem, depreciação, custos anuais e consumo de combustível ou energia. Revise o IPVA e o licenciamento estimados para São Paulo. Os cards permitem editar, duplicar e excluir opções.

### 02 — Comparação

Selecione até quatro opções. Compare os custos operacionais contra o veículo atual, incluindo TCO de caixa, TCO econômico e componentes mensais ou anuais. Na coluna **Diferença**, valor positivo indica economia operacional.

### 03 — Financiamento

Escolha uma opção, informe preço, entrada, taxa e prazo do contrato PRICE. Configure aportes ou cobranças periódicas, escolha a estratégia salva e clique em **Salvar e calcular financiamento**. Compare as três estratégias, examine os gráficos e a tabela mensal ou anual e exporte CSV.

### 04 — Ciladômetro

Selecione até quatro opções para comparar economia operacional e desembolso financeiro no horizonte do contrato. O aplicativo mostra a estratégia de menor impacto no caixa e preserva empates. A análise financeira não substitui critérios pessoais de escolha.

## Preferências e dados

- O tema claro ou escuro fica salvo neste navegador, inclusive quando você usa uma conta.
- Na conta, entradas dos veículos, configurações financeiras e seleções principais são sincronizadas; TCO e cronogramas são recalculados no navegador.
- Ao sair da conta, a garagem da conta deixa de aparecer. A garagem local do visitante, se houver, continua separada.
- Alterações pendentes exibem o estado de sincronização. Evite fechar a página antes de concluir a gravação.
- Se outra sessão tiver mudado a garagem, a gravação é interrompida e o aplicativo pede uma decisão antes de substituir os dados remotos. Edições iniciadas exatamente ao mesmo tempo ainda podem disputar a gravação.
- Em **Configurações da conta → Dados da garagem**, **Limpar dados** remove a garagem do modo em uso: da conta quando você está conectado, ou deste navegador no modo visitante. A conta não é excluída.

## Premissas e limitações

Os resultados dependem das entradas fornecidas e não constituem recomendação financeira. TCO de caixa, TCO econômico e fluxo de caixa do financiamento são conceitos separados. O principal amortizado reduz a dívida, mas não é custo econômico isolado.

Dados salvos em `localhost` pertencem a outra origem e não aparecem automaticamente no site publicado. A entrega de emails de confirmação e recuperação depende da configuração de envio do projeto Supabase.

Para entender o produto e contribuir, consulte [a especificação do produto](docs/PRODUCT_SPEC.md), [o modelo financeiro](docs/FINANCIAL_MODEL.md), [o guia funcional](docs/APPLICATION_GUIDE.md), [a identidade visual](docs/VISUAL_IDENTITY.md) e [a configuração do Supabase](docs/SUPABASE_SETUP.md).

O GitHub está ligado à Vercel: um push para `main` inicia o build e, se ele passar, atualiza o site. Um commit apenas no computador não altera a produção.

## Instalação local (opcional)

Para executar o projeto no seu computador, siga [Instalar local: como instalar localmente](docs/INSTALL_LOCAL.md).
