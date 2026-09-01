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

const NEUTRAL_QUALIFIERS = [
  'consideradas as circunstâncias descritas no enunciado',
  'à luz do regime jurídico aplicável à hipótese narrada',
  'considerando apenas os dados expressamente informados no caso',
  'diante dos elementos jurídicos apresentados na situação concreta'
];

function padDistractor(text, minLength, salt) {
  let out = String(text || '').trim().replace(/[.;:,]\s*$/, '');
  let i = 0;
  while (out.length < minLength && i < 2) {
    out += `, ${NEUTRAL_QUALIFIERS[(salt + i) % NEUTRAL_QUALIFIERS.length]}`;
    i++;
  }
  return `${out}.`;
}

function normalizeLengthCue(question) {
  if (!Array.isArray(question.options) || question.options.length !== 4) return question;
  const correct = Number(question.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return question;

  const lens = question.options.map(x => String(x || '').trim().length);
  const correctLen = lens[correct];
  const otherLens = lens.filter((_, i) => i !== correct);
  const maxOther = Math.max(...otherLens);
  const avg = lens.reduce((a, b) => a + b, 0) / 4;
  const cueRisk = correctLen > maxOther * 1.22 && correctLen > avg * 1.16;
  if (!cueRisk) return { ...question, cueRisk: false };

  const floor = Math.max(24, Math.floor(correctLen * 0.78));
  const options = question.options.map((opt, i) => i === correct ? String(opt).trim() : padDistractor(opt, floor, i + correct));
  return { ...question, options, cueRisk: true, lengthNormalized: true };
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
  return clean.map((q, i) => rebalanceQuestion(normalizeLengthCue(q), targets[i]));
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

  // O app mescla este retorno sobre a base embutida. Ao devolver também as
  // questões legadas já normalizadas, eliminamos o viés histórico de gabarito B
  // sem precisar alterar o conteúdo jurídico de cada ID individualmente.
  const merged = new Map((window.OAB_QUESTIONS || []).map(q => [q.id, q]));
  stored.forEach(q => merged.set(q.id, q));
  return prepareBank([...merged.values()]);
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
