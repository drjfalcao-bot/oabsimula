import { getCalibratedQuestions } from './fgv-bank.js';

const DB_NAME = 'oab-aprova-question-bank';
const DB_VERSION = 1;
const STORE = 'questions';

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function balancedTargets(n) {
  const targets = shuffle(Array.from({ length: n }, (_, i) => i % 4));
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let i = 2; i < targets.length; i++) {
      if (targets[i] === targets[i - 1] && targets[i] === targets[i - 2]) {
        const j = targets.findIndex((v, k) => k > i && v !== targets[i]);
        if (j > i) {
          [targets[i], targets[j]] = [targets[j], targets[i]];
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return targets;
}

function rebalanceQuestion(question, target) {
  if (!Array.isArray(question.options) || question.options.length !== 4) return question;
  const correct = Number(question.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return question;

  const correctText = question.options[correct];
  const distractors = shuffle(question.options.filter((_, i) => i !== correct));
  const options = [];
  let d = 0;
  for (let i = 0; i < 4; i++) options[i] = i === target ? correctText : distractors[d++];
  return { ...question, options, correct: target, answerPositionNormalized: true };
}

function prepareBank(questions) {
  const clean = questions.filter(q => q && q.id && Array.isArray(q.options) && q.options.length === 4);
  const targets = balancedTargets(clean.length);
  return clean.map((q, i) => rebalanceQuestion(q, targets[i]));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('subject', 'subject', { unique: false });
        store.createIndex('topic', 'topic', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function transaction(mode, handler) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try { result = handler(store); } catch (error) { reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Transação abortada')); };
  }));
}

export async function getAllQuestions() {
  const db = await openDb();
  const stored = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });

  // Substitui o antigo banco-semente por versões casuísticas de dificuldade
  // calibrada. Os IDs são preservados para não quebrar histórico e revisões.
  const calibrated = await getCalibratedQuestions();
  const upgrades = new Map(calibrated.map(q => [q.id, q]));
  const builtins = Array.isArray(window.OAB_QUESTIONS) ? window.OAB_QUESTIONS : [];
  builtins.forEach(q => {
    const upgrade = upgrades.get(q.id);
    if (upgrade) Object.assign(q, upgrade, { sourceType: 'autoral-fgv-calibrado', quality: 'editorial-v2' });
  });

  // app.js captura referências rasas dos objetos antes do import dinâmico.
  // A mutação em lugar mantém essas referências e permite corrigir letra/ordem
  // sem invalidar tentativas e revisões já vinculadas aos IDs antigos.
  const preparedBuiltins = prepareBank(builtins);
  const preparedById = new Map(preparedBuiltins.map(q => [q.id, q]));
  builtins.forEach(q => {
    const prepared = preparedById.get(q.id);
    if (prepared) Object.assign(q, prepared);
  });

  // Questões importadas/geradas também têm as posições do gabarito
  // normalizadas em cada carregamento. O texto, porém, não é adulterado para
  // "igualar tamanho": lotes ruins devem ser rejeitados na fábrica, não maquiados.
  return prepareBank(stored);
}

export async function countQuestions() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function putQuestions(questions) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    questions.forEach(q => store.put(q));
    tx.oncomplete = () => { db.close(); resolve(questions.length); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function replaceQuestions(questions) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    questions.forEach(q => store.put(q));
    tx.oncomplete = () => { db.close(); resolve(questions.length); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function clearQuestions() {
  return transaction('readwrite', store => store.clear());
}

export async function deleteQuestion(id) {
  return transaction('readwrite', store => store.delete(id));
}
