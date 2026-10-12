# Configuração inicial do Supabase — BuyCar Lab - BR

> Estrutura criada no projeto em 2026-10-12 e usada pela aplicação v1.3.0. Não execute o SQL inicial novamente neste projeto.

## Projeto correto

- Nome no painel: **BuyCar Lab - BR**.
- Identificador: `pvohwmsmsvvksefeljxh`.
- URL pública do projeto: `https://pvohwmsmsvvksefeljxh.supabase.co`.
- Branch do Supabase: **main / PRODUCTION**.

## O que será criado

O arquivo [`../supabase/initial_schema.sql`](../supabase/initial_schema.sql) contém quatro tabelas:

| Tabela | Campos principais | Finalidade |
| --- | --- | --- |
| `profiles` | `user_id`, `display_name` | Nome exibido da conta. Email e senha ficam no Supabase Auth. |
| `vehicles` | `id`, `user_id`, `vehicle_role`, `sort_order`, `vehicle_data` | Veículo atual e opções, com ordem estável. `vehicle_data` guarda os campos atuais de ICE, HEV, PHEV ou BEV. |
| `financing_configs` | `candidate_id`, `user_id`, `financing_input` | Entradas de um financiamento por opção. Excluir a opção exclui essa configuração. |
| `garage_settings` | `user_id`, `selected_comparison_candidate_id`, `selected_financing_candidate_id` | Primeiras seleções persistentes das telas. |

Os campos `vehicle_data` e `financing_input` são objetos JSON para conservar exatamente as entradas que o aplicativo já utiliza, inclusive os formatos diferentes de motorização e a agenda de aportes. O código da aplicação validará esses objetos antes de salvar e depois de ler. TCO, parcelas, cronogramas e recomendações serão recalculados no navegador. O tema e as seleções extras temporárias continuam locais.

### Campos dentro de `vehicle_data`

`vehicle_data` é uma coluna única que contém um objeto com vários campos; ela não representa um texto solto nem perde as informações do formulário. Todos os veículos guardam:

| Campo do formulário | Chave dentro de `vehicle_data` |
| --- | --- |
| Nome do veículo | `name` |
| Motorização | `powertrain` (`ICE`, `HEV`, `PHEV` ou `BEV`) |
| Quilometragem anual | `annualMileageKm` |
| Valor do veículo | `vehicleValue` |
| Depreciação anual | `annualDepreciationRate`, como decimal: 4,1% vira `0.041` |
| Seguro, IPVA, licenciamento e manutenção | `annualCosts.insurance`, `propertyTax`, `licensing`, `maintenance` |

As informações de energia variam conforme a motorização:

| Motorização | Campos adicionais salvos |
| --- | --- |
| ICE e HEV | `fuel.description`, `fuel.consumption.value`, `fuel.consumption.unit`, `fuel.pricePerLiter` |
| BEV | `electricity.consumptionKwhPer100Km`, `electricity.pricePerKwh`, `electricity.chargingLossRate` |
| PHEV | Todos os campos de `fuel` e `electricity`, mais `electricShare` e `combustionShare` |

Percentuais são números decimais: 50% vira `0.5`; valores em reais são números, sem `R$` ou separador de milhar. Campos de energia que não pertencem à motorização escolhida não entram no objeto salvo. Os controles “usar estimativa automática de SP”, “usar padrão de 2026” e “usar quilometragem do veículo atual” não são salvos como opções separadas na v1.2.0: seus **valores resultantes** são salvos, e o formulário infere os estados ao reabrir. Esse é o comportamento atual do `localStorage` e será preservado na importação.

O arquivo habilita **Row Level Security (RLS)** nas quatro tabelas. Cada conta só pode ler e alterar linhas cujo `user_id` seja seu próprio ID de autenticação. O papel `anon`, usado pelo visitante, não recebe acesso: o visitante continua no `localStorage`. A chave secreta do projeto não deve ser colocada no site nem enviada por mensagem.

## Reproduzir em outro projeto (não repetir no projeto atual)

1. Abra o projeto **BuyCar Lab - BR** e confira no topo **main / PRODUCTION**.
2. No menu lateral, abra **SQL Editor** e escolha **New query**.
3. Abra [`../supabase/initial_schema.sql`](../supabase/initial_schema.sql) no computador, copie todo o conteúdo e cole na consulta.
4. Revise o início e o fim: deve começar com `begin;` e terminar com `commit;`. Clique em **Run** uma única vez.
5. Em **Database → Tables**, confira `profiles`, `vehicles`, `financing_configs` e `garage_settings` no schema `public`. Ainda estarão vazias.
6. Informe o resultado da execução. O Codex verificará pelo plugin as tabelas, colunas, políticas e avisos de segurança antes de integrar a aplicação.

O SQL Editor não registra essa execução inicial como uma migração do Supabase; o arquivo versionado neste repositório preserva o conteúdo executado. A correção posterior das permissões padrão foi aplicada como migração `restrict_garage_table_grants`. Se surgir um erro, não repita a consulta nem edite tabelas manualmente antes de analisar a mensagem.

## Configurações posteriores

- **Authentication → Providers → Email:** manter a confirmação de email ativada.
- **Authentication → URL Configuration:** configurar a URL de produção e os redirecionamentos de desenvolvimento antes de testar os links.
- **Authentication → SMTP Settings:** a v1.3.0 mantém temporariamente o envio padrão por decisão do usuário. Ele restringe destinatários à equipe do projeto e não é adequado para cadastro público. Configurar e testar SMTP próprio antes de anunciar contas para todos.
- **Vercel:** manter apenas a URL pública do projeto e a chave *publishable* como variáveis de ambiente. Nunca usar `service_role` ou chave secreta no frontend.

Nenhuma dessas configurações posteriores é feita pelo SQL inicial.

### Como os serviços se ligam nesta etapa

O GitHub já entrega o código do site à Vercel. O navegador do usuário acessará o Supabase diretamente pelo SDK no aplicativo React. As integrações opcionais **Supabase ↔ GitHub** (migrações e branches do banco) e **Supabase ↔ Vercel** (sincronização automática de variáveis) não são necessárias para autenticação e dados. Nesta primeira integração, as variáveis serão configuradas manualmente para manter o fluxo simples e verificável.

No Supabase, em **Authentication → URL Configuration**:

1. Definir **Site URL** como `https://buy-car-lab-br.vercel.app`.
2. Adicionar `http://localhost:5173/**` em **Redirect URLs** para desenvolvimento local.
3. Se os links de confirmação usarem um destino explícito, adicionar também `https://buy-car-lab-br.vercel.app/**` aos redirecionamentos permitidos.

O domínio da Vercel não precisa ser cadastrado como domínio personalizado do banco. A Site URL define o destino dos emails de confirmação e recuperação de senha.

Na Vercel, as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` devem estar em **Production**. A URL é a exibida no topo deste documento; a chave *publishable* vem de **Supabase → Settings → API Keys**. Ambas são valores públicos do frontend e podem usar o tipo **Config**. Elas são embutidas no JavaScript do navegador durante o build; um deploy novo é necessário após alterá-las. Para desenvolvimento local, `app/.env.local` usa as mesmas variáveis e está ignorado pelo Git; `app/.env.example` mostra os nomes sem divulgar a chave real.
