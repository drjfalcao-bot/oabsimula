import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const app = initializeApp(window.OAB_FIREBASE_CONFIG);
const auth = getAuth(app);
const functions = getFunctions(app, 'southamerica-east1');
const tutorOab = httpsCallable(functions, 'tutorOab');

const statusEl = document.getElementById('status');
const answerEl = document.getElementById('answer');
const subjectEl = document.getElementById('subject');
const questionEl = document.getElementById('question');

onAuthStateChanged(auth, (user) => {
  if (user) statusEl.textContent = 'Conectado: ' + (user.displayName || user.email);
  else statusEl.textContent = 'Desconectado. Entre com Google para usar o tutor.';
});

document.getElementById('login').onclick = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (error) { answerEl.textContent = 'Erro no login: ' + (error.message || error); }
};

document.getElementById('logout').onclick = async () => { await signOut(auth); };

document.getElementById('ask').onclick = async () => {
  const question = questionEl.value.trim();
  if (!auth.currentUser) { answerEl.textContent = 'Entre com Google antes de perguntar.'; return; }
  if (question.length < 3) { answerEl.textContent = 'Escreva uma pergunta.'; return; }
  answerEl.textContent = 'Pensando...';
  try {
    const result = await tutorOab({
      subject: subjectEl.value,
      question,
      context: 'Aluno usando o OAB APROVA Premium para preparação da 1ª ou 2ª fase. Priorize regra, exceção, pegadilha FGV, identificação de peça e estrutura de resposta quando forem relevantes.'
    });
    answerEl.textContent = result.data.answer || 'Sem resposta.';
  } catch (error) {
    answerEl.textContent = 'Erro ao chamar o tutor: ' + (error.message || error);
  }
};
