import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js';

await import('./data.js');
await import('./learning-materials.js');
await import('./oab-intelligence.js');

const STATE_KEY = 'oab-aprova-premium-v1';
const CONTEXT_KEY = 'oab-aprova-professor-context-v1';
const CHAT_KEY = 'oab-aprova-professor-chat-v1';
const MAX_MESSAGES = 24;
const GUIDED_CONTEXT_TTL = 6 * 60 * 60 * 1000;
const $ = (id) => document.getElementById(id);
const INTEL = window.OAB_INTELLIGENCE || null;

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
let currentUser = null;

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
  if (INTEL) {
    try {
      const id = INTEL.canonicalSubject(value);
      if (INTEL.SUBJECTS?.[id]?.name) return INTEL.SUBJECTS[id].name;
    } catch {}
  }
  return String(value || 'Geral OAB').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function adaptiveSnapshot(source) {
  if (!INTEL) return null;
  try {
    const strategy = source?.profile?.strategy === 'balanced' ? 'balanced' : 'core';
    const readiness = INTEL.readiness(source || {});
    const recommendations = INTEL.recommendations(source || {}, { strategy, limit: 4 }).map(r => ({
      subject: r.subjectName,
      topic: r.topic.label,
      historicalShare: Math.round(r.topic.historicalShare * 100),
      mastery: Math.round(r.stats.estimated * 100),
      sample: r.stats.n,
      due: r.stats.due,
      recoverable: Number(r.recoverable.toFixed(2)),
      action: r.action.label,
      reason: INTEL.explainRecommendation(r)
    }));
    return {
      projected: Number(readiness.projected.toFixed(1)),
      coverage: Math.round(readiness.coverage * 100),
      robust: Math.round(readiness.robust * 100),
      fragilePoints: Number(readiness.fragilePoints.toFixed(1)),
      recommendations
    };
  } catch {
    return null;
  }
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
    .map(([subject, v]) => ({ subject: prettySubject(subject), accuracy: Math.round((v.correct / v.total) * 100), total: v.total }))
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
    guidedAnswered: Number(source?.guided?.answered || 0),
    adaptive: adaptiveSnapshot(source)
  };
}

function renderStudySummary() {
  const s = computeStudySnapshot();
  $('recentAccuracy').textContent = s.recentAccuracy == null ? '—' : `${s.recentAccuracy}%`;
  $('dueReviews').textContent = String(s.dueReviews);

  if (!s.recentAttempts) {
    const top = s.adaptive?.recommendations?.[0];
    $('studySummary').textContent = top ? `Ainda há pouca amostra. O primeiro alvo diagnóstico é ${top.subject} — ${top.topic}.` : 'Ainda há pouco histórico. O professor usará a conversa e a questão atual para conduzir o estudo.';
    return;
  }

  const top = s.adaptive?.recommendations?.[0];
  if (top) {
    $('studySummary').textContent = `${s.recentAttempts} tentativas recentes, ${s.openReviews} revisões abertas. Prioridade calculada: ${top.subject} — ${top.topic} (${top.action}).`;
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
  $('subtitle').textContent = 'A questão, sua resposta, causa do erro e prioridade adaptativa estão carregadas no contexto do professor.';
}

function renderMessages() {
  const chat = $('chat');
  chat.innerHTML = '';

  if (!messages.length) {
    const q = currentQuestion();
    const initial = q
      ? `Questão carregada. Você marcou ${q.selectedLetter || 'uma alternativa'} e o gabarito é ${q.correctLetter || 'o registrado no banco'}. Posso localizar o desvio, testar o mesmo conceito ou transformar isso em revisão ativa.`
      : 'Posso explicar conceitos, revisar erros, testar recuperação ativa e escolher a próxima ação pelo mesmo motor adaptativo da Trilha.';
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
    'ALTERNATIVAS:', options,
    `RESPOSTA DO ALUNO: ${q.selectedLetter || 'não registrada'}`,
    `GABARITO FIXO DO BANCO: ${q.correctLetter || 'não informado'}`,
    `RESULTADO: ${q.wasCorrect ? 'acertou' : 'errou'}`,
    q.errorCause ? `CAUSA DO ERRO DECLARADA: ${normalizeText(q.errorCause, 80)}` : '',
    q.editorialNote ? `COMENTÁRIO EDITORIAL: ${normalizeText(q.editorialNote, 500)}` : '',
    q.intelligence ? `SINAL ESTRATÉGICO: ${JSON.stringify(q.intelligence)}` : ''
  ].filter(Boolean).join('\n');
}

function buildStudyBlock() {
  const s = computeStudySnapshot();
  const weak = s.weakSubjects.map(x => `${x.subject}: ${x.accuracy}%/${x.total}q`).join('; ') || 'sem amostra suficiente';
  const causes = Object.entries(s.errorCauses).map(([k, v]) => `${k}:${v}`).join(', ') || 'sem classificação suficiente';
  const adaptive = s.adaptive;
  const queue = adaptive?.recommendations?.map((x,i)=>`${i+1}) ${x.subject} — ${x.topic}: domínio ${x.mastery}%, incidência ${x.historicalShare}% da matéria, ação ${x.action}, +${x.recoverable} pt recuperável*`).join('; ') || 'fila adaptativa ainda sem dados';
  const model = adaptive ? ` Projeção modelada ${adaptive.projected}/80; cobertura diagnóstica ${adaptive.coverage}%; domínio robusto ${adaptive.robust}%; pontos frágeis ${adaptive.fragilePoints}. Fila adaptativa: ${queue}.` : '';
  return `PERFIL PEDAGÓGICO RECENTE: ${s.recentAttempts} tentativas; acerto ${s.recentAccuracy ?? 's/d'}%; ${s.dueReviews} revisões vencidas; ${s.openReviews} revisões abertas; matérias mais frágeis por acerto bruto: ${weak}; causas de erro: ${causes}.${model}`;
}

function buildConversationBlock() {
  const prior = messages.slice(0, -1).slice(-6);
  if (!prior.length) return '';
  return 'CONVERSA RECENTE:\n' + prior.map(m => `${m.role === 'user' ? 'ALUNO' : 'PROFESSOR'}: ${normalizeText(m.content, 420)}`).join('\n');
}

function buildContextForModel() {
  const instruction = 'MODO PROFESSOR OAB APROVA. A prioridade de estudo deve seguir o motor adaptativo fornecido, não simples percentual bruto. Incidência histórica é sinal estratégico, não regra jurídica nem previsão determinística. Use o histórico para decidir profundidade e próxima ação. Não altere o gabarito fornecido pelo banco. Diferencie regra, exceção e pegadilha FGV. Se o aluno errou, trate a causa declarada: conhecimento = regra mínima + recuperação; confusão = contraste de institutos; leitura = dado decisivo + técnica. Prefira recuperação ativa. Não invente artigo, súmula, precedente, prazo ou quórum; quando não tiver segurança numérica, explique a regra sem numeração.';
  const blocks = [instruction, buildStudyBlock(), buildQuestionBlock(), buildConversationBlock()].filter(Boolean);
  return blocks.join('\n\n').slice(0, 6500);
}

function ensureGeminiLoaded() {
  if (window.OABGemini) return Promise.resolve(window.OABGemini);
  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-oab-gemini-provider]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'gemini-provider.js';
      script.dataset.oabGeminiProvider = '1';
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.OABGemini), { once: true });
    script.addEventListener('error', () => reject(new Error('Não foi possível carregar o conector Gemini.')), { once: true });
  });
}

async function askWithGemini(question) {
  const gemini = await ensureGeminiLoaded();
  if (!gemini?.isConnected()) throw new Error('Gemini não conectado.');
  return gemini.generate({
    system: 'Você é o Professor IA do OAB APROVA. Ensine para aprovação na 1ª fase da OAB. Use a fila adaptativa enviada como estratégia; não confunda incidência histórica com norma. Seja juridicamente rigoroso. Nas questões, explique o ponto de discriminação e nunca altere o gabarito fornecido. Não invente artigo, súmula, precedente, prazo ou quórum. Use recuperação ativa e adapte a intervenção à causa do erro.',
    prompt: `MATÉRIA/ÁREA: ${$('subject').value}\n\n${buildContextForModel()}\n\nPERGUNTA DO ALUNO: ${question}`,
    maxOutputTokens: 1800,
    temperature: 0.15
  });
}

async function askWithCentral(question) {
  if (!auth.currentUser) throw new Error('Entre com Google ou conecte seu Gemini para usar o Professor IA.');
  const result = await tutorOab({ subject: $('subject').value, question, context: buildContextForModel() });
  return result.data?.answer || 'Não recebi uma resposta do professor.';
}

async function askProfessor(rawQuestion) {
  const question = String(rawQuestion || '').trim().slice(0, 1600);
  if (busy || question.length < 2) return;

  busy = true;
  $('ask').disabled = true;
  addMessage('user', question);
  $('question').value = '';
  const thinking = appendMessageElement('assistant', 'Analisando seu histórico, fila adaptativa e questão…', 'thinking');

  try {
    const gemini = await ensureGeminiLoaded().catch(() => null);
    let answer;
    if (gemini?.isConnected()) {
      answer = await askWithGemini(question);
    } else {
      try {
        answer = await askWithCentral(question);
      } catch (centralError) {
        thinking.remove();
        const system = appendMessageElement('system', `O professor central não respondeu (${centralError?.message || centralError}). Você pode conectar gratuitamente sua própria Gemini API nesta página.`);
        system.style.cursor = 'pointer';
        system.title = 'Clique para conectar Gemini';
        system.onclick = async () => {
          const g = await ensureGeminiLoaded();
          const ok = await g.connect();
          updateProviderUi();
          if (ok) askProfessor(question);
        };
        return;
      }
    }
    thinking.remove();
    addMessage('assistant', answer);
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

function installProviderButton() {
  if ($('geminiConnect')) return;
  const row = document.querySelector('.top .row');
  if (!row) return;
  const button = document.createElement('button');
  button.className = 'light';
  button.id = 'geminiConnect';
  row.insertBefore(button, row.firstChild);
  button.onclick = async () => {
    const gemini = await ensureGeminiLoaded();
    if (gemini.isConnected()) {
      if (confirm('Desconectar o Gemini desta aba?')) gemini.disconnect();
    } else {
      await gemini.connect();
    }
    updateProviderUi();
  };
}

async function updateProviderUi() {
  installProviderButton();
  const gemini = await ensureGeminiLoaded().catch(() => null);
  const connected = Boolean(gemini?.isConnected());
  const button = $('geminiConnect');
  if (button) {
    button.textContent = connected ? `Gemini conectado` : 'Conectar Gemini';
    button.title = connected ? `Usando ${gemini.MODEL}. Clique para desconectar.` : 'Usar sua própria cota da Gemini API';
  }
  if (connected) {
    $('status').textContent = currentUser ? `Google + Gemini` : 'Gemini conectado';
  } else if (currentUser) {
    $('status').textContent = `Conectado: ${currentUser.displayName || currentUser.email || 'Google'}`;
  } else {
    $('status').textContent = 'Conecte Gemini ou entre com Google';
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    $('login').classList.add('hidden');
    $('logout').classList.remove('hidden');
    await refreshCloudState(user);
  } else {
    $('login').classList.remove('hidden');
    $('logout').classList.add('hidden');
  }
  updateProviderUi();
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

window.addEventListener('oab-gemini-status', updateProviderUi);
renderStudySummary();
renderContext();
renderMessages();
updateProviderUi();
