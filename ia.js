import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

const STATE_KEY = 'oab-aprova-premium-v1';
const CONTEXT_KEY = 'oab-aprova-professor-context-v1';
const CHAT_KEY = 'oab-aprova-professor-chat-v1';
const MAX_MESSAGES = 24;
const GUIDED_CONTEXT_TTL = 6 * 60 * 60 * 1000;
const $ = (id) => document.getElementById(id);

const app = getApps()[0] || initializeApp(window.OAB_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1');
const tutorOab = httpsCallable(functions, 'tutorOab');

const launchedFromGuided = new URLSearchParams(window.location.search).get('from') === 'guided';
let state = readJson(STATE_KEY, {});
let professorContext = launchedFromGuided ? readJson(CONTEXT_KEY, null) : null;
if (professorContext && Date.now() - Number(professorContext.createdAt || 0) > GUIDED_CONTEXT_TTL) professorContext = null;
let messages = readJson(CHAT_KEY, []);
let busy = false;

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveMessages() {
  messages = messages.slice(-MAX_MESSAGES);
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
}

function normalizeText(value, max = 1200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function prettySubject(value) {
  return String(value || 'Geral OAB')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function computeStudySnapshot(source = state) {
  const attempts = Array.isArray(source?.attempts) ? source.attempts : [];
  const recent = attempts.slice(-80);
  const bySubject = {};
  const causes = {};

  for (const a of recent) {
    const subject = a.subject || 'geral';
    bySubject[subject] ||= { total: 0, correct: 0 };
    bySubject[subject].total += 1;
    if (a.correct) bySubject[subject].correct += 1;
    if (!a.correct && a.cause) causes[a.cause] = (causes[a.cause] || 0) + 1;
  }

  const weakSubjects = Object.entries(bySubject)
    .filter(([, v]) => v.total >= 2)
    .map(([subject, v]) => ({
      subject: prettySubject(subject),
      accuracy: Math.round((v.correct / v.total) * 100),
      total: v.total
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 5);

  const reviews = source?.reviews && typeof source.reviews === 'object' ? Object.values(source.reviews) : [];
  const now = Date.now();
  const openReviews = reviews.filter(r => !r.mastered).length;
  const dueReviews = reviews.filter(r => !r.mastered && Number(r.due || 0) <= now).length;
  const total = recent.length;
  const correct = recent.filter(a => a.correct).length;

  return {
    recentAttempts: total,
    recentAccuracy: total ? Math.round((correct / total) * 100) : null,
    weakSubjects,
    errorCauses: causes,
    openReviews,
    dueReviews,
    guidedAnswered: Number(source?.guided?.answered || 0)
  };
}

function renderStudySummary() {
  const s = computeStudySnapshot();
  $('recentAccuracy').textContent = s.recentAccuracy == null ? '—' : `${s.recentAccuracy}%`;
  $('dueReviews').textContent = String(s.dueReviews);

  if (!s.recentAttempts) {
    $('studySummary').textContent = 'Ainda há pouco histórico. O professor usará a conversa e a questão atual para conduzir o estudo.';
    return;
  }

  const weakest = s.weakSubjects[0];
  const weakText = weakest ? ` Ponto mais fraco recente: ${weakest.subject} (${weakest.accuracy}% em ${weakest.total} questões).` : '';
  $('studySummary').textContent = `${s.recentAttempts} tentativas recentes, ${s.openReviews} revisões abertas.${weakText}`;
}

function currentQuestion() {
  const q = professorContext?.question;
  if (!q || !q.question || !Array.isArray(q.options)) return null;
  return q;
}

function renderContext() {
  const q = currentQuestion();
  const needsContext = [...document.querySelectorAll('#quickActions button')].slice(0, 3);
  needsContext.forEach(b => b.classList.toggle('hidden', !q));

  if (!q) {
    $('contextBanner').classList.add('hidden');
    $('questionSideCard').classList.add('hidden');
    $('backGuided').classList.add('hidden');
    return;
  }

  $('contextBanner').classList.remove('hidden');
  $('questionSideCard').classList.remove('hidden');
  $('backGuided').classList.remove('hidden');
  $('contextTitle').textContent = q.wasCorrect ? 'Questão respondida corretamente' : 'Questão respondida com erro';
  $('contextText').textContent = normalizeText(q.question, 360);
  $('questionSideText').textContent = normalizeText(q.question, 240);

  const meta = [q.source, q.subject, q.topic, q.selectedLetter ? `Você marcou ${q.selectedLetter}` : null, q.correctLetter ? `Gabarito ${q.correctLetter}` : null].filter(Boolean);
  $('contextMeta').innerHTML = '';
  meta.forEach(item => {
    const span = document.createElement('span');
    span.className = 'pill';
    span.textContent = item;
    $('contextMeta').appendChild(span);
  });

  const subject = q.subject;
  if (subject) {
    const option = [...$('subject').options].find(o => o.textContent.toLowerCase() === String(subject).toLowerCase());
    if (option) $('subject').value = option.value;
  }
  $('subtitle').textContent = 'A questão, sua resposta e seu histórico já estão carregados no contexto do professor.';
}

function renderMessages() {
  const chat = $('chat');
  chat.innerHTML = '';

  if (!messages.length) {
    const q = currentQuestion();
    const initial = q
      ? `Questão carregada. Você marcou ${q.selectedLetter || 'uma alternativa'} e o gabarito é ${q.correctLetter || 'o registrado no banco'}. Posso explicar o ponto exato do erro, testar o mesmo conceito ou transformar isso em revisão ativa.`
      : 'Posso explicar conceitos, revisar seus erros, testar recuperação ativa e escolher a prioridade de estudo a partir do seu histórico no OAB APROVA.';
    appendMessageElement('assistant', initial);
    return;
  }

  messages.forEach(m => appendMessageElement(m.role, m.content));
  chat.scrollTop = chat.scrollHeight;
}

function appendMessageElement(role, content, extraClass = '') {
  const el = document.createElement('div');
  el.className = `message ${role} ${extraClass}`.trim();
  el.textContent = content;
  $('chat').appendChild(el);
  $('chat').scrollTop = $('chat').scrollHeight;
  return el;
}

function addMessage(role, content) {
  messages.push({ role, content: String(content || '').slice(0, 5000), ts: Date.now() });
  saveMessages();
  renderMessages();
}

function buildQuestionBlock() {
  const q = currentQuestion();
  if (!q) return 'QUESTÃO ATUAL: nenhuma questão específica foi encaminhada.';

  const options = q.options.slice(0, 4).map((o, i) => {
    const letter = o.letter || String.fromCharCode(65 + i);
    return `${letter}) ${normalizeText(o.text, 300)}`;
  }).join('\n');

  return [
    'QUESTÃO ATUAL DO OAB APROVA:',
    q.qid ? `ID: ${normalizeText(q.qid, 140)}` : '',
    normalizeText(q.question, 1250),
    'ALTERNATIVAS:',
    options,
    `RESPOSTA DO ALUNO: ${q.selectedLetter || 'não registrada'}`,
    `GABARITO FIXO DO BANCO: ${q.correctLetter || 'não informado'}`,
    `RESULTADO: ${q.wasCorrect ? 'acertou' : 'errou'}`,
    q.errorCause ? `CAUSA DO ERRO DECLARADA: ${normalizeText(q.errorCause, 80)}` : '',
    q.editorialNote ? `COMENTÁRIO EDITORIAL: ${normalizeText(q.editorialNote, 500)}` : ''
  ].filter(Boolean).join('\n');
}

function buildStudyBlock() {
  const s = computeStudySnapshot();
  const weak = s.weakSubjects.map(x => `${x.subject}: ${x.accuracy}%/${x.total}q`).join('; ') || 'sem amostra suficiente';
  const causes = Object.entries(s.errorCauses).map(([k, v]) => `${k}:${v}`).join(', ') || 'sem classificação suficiente';
  return `PERFIL PEDAGÓGICO RECENTE: ${s.recentAttempts} tentativas; acerto ${s.recentAccuracy ?? 's/d'}%; ${s.dueReviews} revisões vencidas; ${s.openReviews} revisões abertas; matérias mais frágeis: ${weak}; causas de erro: ${causes}.`;
}

function buildConversationBlock() {
  const prior = messages.slice(0, -1).slice(-6);
  if (!prior.length) return '';
  return 'CONVERSA RECENTE:\n' + prior.map(m => `${m.role === 'user' ? 'ALUNO' : 'PROFESSOR'}: ${normalizeText(m.content, 420)}`).join('\n');
}

function buildContextForModel() {
  const instruction = 'MODO PROFESSOR OAB APROVA. Use o histórico para decidir profundidade e próxima ação. Não altere o gabarito fornecido pelo banco. Diferencie regra, exceção e pegadilha FGV. Se o aluno errou, localize o desvio de raciocínio antes de despejar teoria. Prefira recuperação ativa: depois de explicar, faça uma pergunta curta ou proponha uma ação de estudo. Não invente artigo, súmula, precedente ou prazo; quando não tiver segurança numérica, explique a regra sem numeração.';
  const blocks = [instruction, buildStudyBlock(), buildQuestionBlock(), buildConversationBlock()].filter(Boolean);
  return blocks.join('\n\n').slice(0, 3500);
}

async function askProfessor(rawQuestion) {
  const question = String(rawQuestion || '').trim().slice(0, 1600);
  if (busy || question.length < 2) return;

  if (!auth.currentUser) {
    appendMessageElement('system', 'Entre com Google para usar o Professor IA. A Questão Guiada continua funcionando normalmente sem o chat.');
    return;
  }

  busy = true;
  $('ask').disabled = true;
  addMessage('user', question);
  $('question').value = '';
  const thinking = appendMessageElement('assistant', 'Analisando seu histórico e a questão…', 'thinking');

  try {
    const result = await tutorOab({
      subject: $('subject').value,
      question,
      context: buildContextForModel()
    });
    thinking.remove();
    addMessage('assistant', result.data?.answer || 'Não recebi uma resposta do professor.');
  } catch (error) {
    thinking.remove();
    appendMessageElement('system', `Não foi possível chamar o Professor IA: ${error?.message || error}`);
  } finally {
    busy = false;
    $('ask').disabled = false;
    $('question').focus();
  }
}

function resetChat() {
  messages = [];
  localStorage.removeItem(CHAT_KEY);
  renderMessages();
}

async function refreshCloudState(user) {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid, 'state', 'main'));
    if (snap.exists() && Number(snap.data()?.updatedAt || 0) > Number(state?.updatedAt || 0)) {
      state = snap.data();
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      renderStudySummary();
    }
  } catch {
    // O chat continua usando o estado local se a leitura de nuvem falhar.
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    $('status').textContent = `Conectado: ${user.displayName || user.email || 'Google'}`;
    $('login').classList.add('hidden');
    $('logout').classList.remove('hidden');
    await refreshCloudState(user);
  } else {
    $('status').textContent = 'Entre com Google para conversar';
    $('login').classList.remove('hidden');
    $('logout').classList.add('hidden');
  }
});

$('login').onclick = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (error) { appendMessageElement('system', `Erro no login: ${error?.message || error}`); }
};

$('logout').onclick = async () => { await signOut(auth); };
$('clearChat').onclick = resetChat;
$('ask').onclick = () => askProfessor($('question').value);
$('question').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    askProfessor($('question').value);
  }
});

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => askProfessor(button.dataset.prompt));
});

renderStudySummary();
renderContext();
renderMessages();
