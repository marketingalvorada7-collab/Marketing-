import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * COLE AQUI a configuração do seu projeto Firebase.
 *
 * Como conseguir isso (veja o passo a passo completo no README.md):
 * 1. Acesse https://console.firebase.google.com e crie um projeto (grátis)
 * 2. Dentro do projeto, clique no ícone "</>" para adicionar um app Web
 * 3. O Firebase mostra um bloco "firebaseConfig" — copie e cole no lugar do objeto abaixo
 * 4. Ative o Firestore Database (em "Build > Firestore Database > Criar banco de dados",
 *    modo de produção, e depois cole o conteúdo de firestore.rules na aba "Regras")
 */
const firebaseConfig = {
  apiKey: "AIzaSyAwCWvg_Z4_Q-QF8IkXN6VBC1jxKVwfZ1c",
  authDomain: "agenda-f4408.firebaseapp.com",
  projectId: "agenda-f4408",
  storageBucket: "agenda-f4408.firebasestorage.app",
  messagingSenderId: "1031180172181",
  appId: "1:1031180172181:web:fdfa284b738dbb0101549c",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
