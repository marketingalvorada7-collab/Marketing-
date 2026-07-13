# Agenda Semanal — versão com Firebase

Mesmo app que vocês já usavam (checklist, recorrências automáticas, resumo por
pessoa, histórico), agora rodando com um banco de dados de verdade (Firestore)
e hospedado fora do Claude — então os dados nunca mais somem quando o app for
atualizado.

## 1. Criar o projeto no Firebase (grátis, ~5 minutos)

1. Acesse **https://console.firebase.google.com** e faça login com uma conta Google
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `agenda-semanal`) e siga o assistente (pode desativar o Google Analytics, não é necessário)
3. Dentro do projeto, clique no ícone **`</>`** ("Adicionar app" → Web)
4. Dê um apelido ao app (ex: `agenda-web`) e clique em **"Registrar app"**
5. O Firebase vai mostrar um bloco de código chamado `firebaseConfig` parecido com isto:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "agenda-semanal-xxxx.firebaseapp.com",
     projectId: "agenda-semanal-xxxx",
     storageBucket: "agenda-semanal-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456",
   };
   ```
   **Copie esse bloco inteiro.**
6. Abra o arquivo `src/firebase.js` deste projeto e **substitua** o objeto `firebaseConfig` de exemplo pelo que você copiou.

## 2. Ativar o banco de dados (Firestore)

1. No menu lateral do Firebase, vá em **Build → Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Escolha o modo **"Produção"** e a localização mais próxima (ex: `southamerica-east1` para o Brasil)
4. Depois de criado, vá na aba **"Regras"** dentro do Firestore Database
5. Apague o conteúdo e cole o conteúdo do arquivo `firestore.rules` (já incluído neste projeto — deixa qualquer pessoa com o link ler/escrever, igual ao pedido original)
6. Clique em **"Publicar"**

## 3. Rodar localmente (para testar antes de publicar)

Você precisa ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
npm run dev
```

Abra o link que aparecer no terminal (algo como `http://localhost:5173`). Teste
adicionar demandas, marcar como concluída, etc. Como já é um site de verdade
conectado ao Firestore, tudo que você salvar aqui já é definitivo.

## 4. Publicar para o time acessar (escolha uma opção)

### Opção A — Firebase Hosting (recomendado, tudo no mesmo lugar)

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # escolha o projeto que você criou no passo 1
npm run build
firebase deploy
```

No final, o terminal mostra o link público (algo como
`https://agenda-semanal-xxxx.web.app`). Envie esse link para o time.

Sempre que eu (Claude) fizer uma alteração no código, é só repetir
`npm run build` e `firebase deploy` — o mesmo link continua funcionando, e os
dados do Firestore não são afetados por isso.

### Opção B — Netlify (arrastar e soltar, sem linha de comando)

```bash
npm run build
```

Isso cria uma pasta `dist`. Acesse **https://app.netlify.com/drop** e arraste
essa pasta `dist` para a página. O Netlify gera um link público na hora.

## 5. Dúvidas comuns

**"Erro de permissão" ao ler/escrever dados**
Confira se você publicou as regras do passo 2 (item 5) corretamente na aba
"Regras" do Firestore.

**Aparece um link pedindo para "criar um índice" no console**
Isso pode acontecer ao excluir uma recorrência com muitas tarefas pendentes.
É só clicar no link que o próprio Firebase mostra no console do navegador —
ele cria o índice automaticamente em 1-2 minutos, e depois disso nunca mais
pede de novo.

**Quero ver/editar os dados diretamente**
Vá em Build → Firestore Database → aba "Dados" no console do Firebase. Dá
para ver e editar tarefas, recorrências e histórico manualmente ali, se
precisar.

**Posso ter mais de um ambiente (teste e produção)?**
Sim — crie um segundo projeto no Firebase para testes e troque a configuração
em `src/firebase.js` quando quiser testar algo antes de ir para o link real
que o time usa.
