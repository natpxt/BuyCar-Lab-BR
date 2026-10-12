# Instalar local: como instalar localmente

O uso normal é pelo [site publicado](https://buy-car-lab-br.vercel.app/). Este guia é para quem deseja executar o código no próprio computador.

## Requisitos

Instale o [Node.js](https://nodejs.org/) 20.19 ou superior, ou 22.12 ou superior. O npm vem junto.

## Instalação

1. Baixe o repositório pelo botão **Code → Download ZIP** no GitHub e extraia o arquivo, ou use `git clone https://github.com/natpxt/BuyCar-Lab-BR.git`.
2. Abra um terminal na pasta do projeto e entre em `app`.
3. Execute `npm install`.
4. Para habilitar contas também no ambiente local, copie `app/.env.example` para `app/.env.local` e substitua somente a chave de exemplo pela chave **publishable** do seu projeto Supabase. Nunca use `sb_secret_` ou `service_role` em variáveis `VITE_`. Sem essas variáveis, o aplicativo funciona apenas no modo visitante.
5. Execute `npm run dev` e abra o endereço mostrado no terminal, normalmente `http://localhost:5173/`.

Mantenha o terminal aberto durante o uso. Pressione `Ctrl + C` para encerrar.

## Atualizar

Se você clonou com Git, execute `git pull` na raiz e `npm install` dentro de `app` quando houver mudança de dependências. Para um ZIP, baixe a nova versão. Em ambos os casos, dados locais permanecem associados ao mesmo endereço de origem no navegador.

O armazenamento de `localhost` é separado do [site publicado](https://buy-car-lab-br.vercel.app/). Use uma conta para acessar a garagem remota em ambos os endereços; a garagem visitante de um endereço não é transferida automaticamente para o outro.
