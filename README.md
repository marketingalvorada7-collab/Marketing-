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

---

## App 2 — Boletos (envio e gestão)

Esse app fica em `public/boletos.html`, é hospedado no **Netlify** (junto com
o resto do site) e usa três serviços, todos com plano gratuito **sem cartão
de crédito**:

- **Firestore** (mesmo projeto Firebase da Agenda Semanal, plano Spark) —
  guarda os dados de cada boleto (nome, regional, valor, vencimento, status)
  na coleção `boletos`, separada da agenda.
- **Cloudinary** — guarda o arquivo do boleto em si (PDF/imagem). O upload
  vai direto do navegador para o Cloudinary, sem passar pelo nosso servidor.
- **Netlify Functions** — uma função serverless (`netlify/functions/extract-boleto.js`)
  que chama a IA (Claude) no servidor para ler o boleto e preencher valor e
  vencimento automaticamente.

Depois de publicado, o app fica em `https://SEU-SITE.netlify.app/boletos.html`.

### 1. Configurar o Cloudinary

1. Abra o seu painel do Cloudinary → **Settings → Upload → Upload presets**.
2. Confirme (ou crie) um preset do tipo **Unsigned** — é ele que permite o
   navegador enviar arquivos direto, sem expor nenhuma chave secreta. Sugestão
   de limites no preset: formatos `pdf,jpg,jpeg,png`, tamanho máximo 5MB.
3. Anote o **Cloud name** (aparece no topo do painel) e o **nome do preset**.
4. Abra `public/boletos.html` e edite estas duas linhas com os valores
   reais:
   ```js
   const CLOUDINARY_CLOUD_NAME = "SEU_CLOUD_NAME";
   const CLOUDINARY_UPLOAD_PRESET = "SEU_UPLOAD_PRESET";
   ```
   Cloud name e nome do preset **não são segredos** — o próprio Cloudinary
   espera que fiquem visíveis no código do navegador; é assim que o upload
   não-assinado funciona.

### 2. Guardar sua chave da Anthropic no Netlify

A extração automática por IA roda na Netlify Function, que lê a chave de uma
variável de ambiente (nunca fica no código nem neste repositório):

1. No painel do Netlify: **Site configuration → Environment variables → Add a variable**.
2. Nome: `ANTHROPIC_API_KEY`. Valor: sua chave (console.anthropic.com → API Keys).
3. Salve. Não precisa refazer o build ainda — o próximo deploy já pega a variável.

### 3. Publicar

Se o site já está conectado ao GitHub no Netlify (deploy automático), basta
dar merge/push nesta branch que ele publica sozinho. Se preferir manual:

```bash
npm run build
```

e arraste a pasta `dist` para **https://app.netlify.com/drop**, ou use a
Netlify CLI (`netlify deploy --prod`) se já tiver o site linkado.

As regras do Firestore (`firestore.rules`) já foram publicadas quando a
Agenda Semanal foi configurada; não precisa mexer nelas de novo.

### Sobre a senha do painel do gestor

A senha (`gestor2026`, definida no topo do `<script>` de `boletos.html`) é
só uma trava simples de tela, não é autenticação de verdade — qualquer pessoa
que veja o código-fonte consegue lê-la. Serve para afastar acesso casual, não
para proteger dados sensíveis. Para trocar, edite a constante
`GATE_PASSWORD` no arquivo e publique de novo.

### Se a extração por IA não estiver configurada

Sem o passo 2, o envio de boletos continua funcionando normalmente — só que
todo boleto entra marcado como "revisar" no painel, para o gestor preencher
valor e vencimento manualmente.

### Testar localmente com as Netlify Functions

`npm run dev` (Vite) não executa a function. Para testar tudo junto, use a
Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

Ela sobe o site e a function juntos, lendo as variáveis de ambiente que você
configurar num arquivo `.env` local (não commitado) ou via `netlify link`.
