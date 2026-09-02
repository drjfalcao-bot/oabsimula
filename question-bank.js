import { getCalibratedQuestions } from './fgv-bank.js';
import { getExpandedQuestions, EXPANDED_QUESTION_COUNT } from './expanded-bank.js';
import { getOfficialFgvQuestions, OFFICIAL_FGV_QUESTION_TARGET, clearOfficialFgvCache } from './official-fgv-bank.js';

const DB_NAME = 'oab-aprova-question-bank';
const DB_VERSION = 2;
const STORE = 'questions';
const CLOUD_COLLECTION = 'question_bank';
const CLOUD_LIMIT = 10000;
let cloudCache = null;
let cloudCacheAt = 0;
let officialLoadError = null;

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
  // Questões oficiais devem conservar a ordem exata do caderno FGV. O anti-padrão
  // de letras é aplicado apenas ao conteúdo autoral/importado que permite reordenação.
  const movable = clean.filter(q => !q.preserveOfficialOrder);
  const targets = balancedTargets(movable.length);
  let cursor = 0;
  return clean.map(q => q.preserveOfficialOrder ? q : rebalanceQuestion(q, targets[cursor++]));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      let store;
      if (!db.objectStoreNames.contains(STORE)) {
        store = db.createObjectStore(STORE, { keyPath: 'id' });
      } else {
        store = req.transaction.objectStore(STORE);
      }
      if (!store.indexNames.contains('subject')) store.createIndex('subject', 'subject', { unique: false });
      if (!store.indexNames.contains('topic')) store.createIndex('topic', 'topic', { unique: false });
      if (!store.indexNames.contains('source')) store.createIndex('source', 'source', { unique: false });
      if (!store.indexNames.contains('origin')) store.createIndex('origin', 'origin', { unique: false });
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

async function getLocalQuestions() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src === src);
    if (existing) {
      if (existing.dataset.loaded === '1' || window.firebase) return resolve();
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = '1'; resolve(); };
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureFirebaseFirestore() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (!window.OAB_FIREBASE_CONFIG) {
    try { await import('./firebase-config.js'); } catch { return null; }
  }
  try {
    if (!window.firebase?.apps) await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
    if (!window.firebase?.firestore) await loadScript('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js');
    if (!window.firebase || !window.OAB_FIREBASE_CONFIG) return null;
    if (!firebase.apps.length) firebase.initializeApp(window.OAB_FIREBASE_CONFIG);
    return firebase.firestore();
  } catch (error) {
    console.warn('Banco central indisponível; seguindo com base editorial/local.', error);
    return null;
  }
}

export async function getCloudQuestions({ force = false } = {}) {
  const fresh = cloudCache && Date.now() - cloudCacheAt < 5 * 60 * 1000;
  if (fresh && !force) return cloudCache;
  const db = await ensureFirebaseFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection(CLOUD_COLLECTION).where('status', '==', 'published').limit(CLOUD_LIMIT).get();
    cloudCache = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, cloud: true }));
    cloudCacheAt = Date.now();
    return cloudCache;
  } catch (error) {
    console.warn('Falha ao carregar banco central.', error);
    return cloudCache || [];
  }
}

async function calibrateBuiltins() {
  const calibrated = await getCalibratedQuestions();
  const upgrades = new Map(calibrated.map(q => [q.id, q]));
  const builtins = Array.isArray(window.OAB_QUESTIONS) ? window.OAB_QUESTIONS : [];
  builtins.forEach(q => {
    const upgrade = upgrades.get(q.id);
    if (upgrade) Object.assign(q, upgrade, { sourceType: 'autoral-fgv-calibrado', quality: 'editorial-v2' });
  });
  const prepared = prepareBank(builtins);
  const byId = new Map(prepared.map(q => [q.id, q]));
  builtins.forEach(q => { const p = byId.get(q.id); if (p) Object.assign(q, p); });
}

export async function getOfflineEditorialQuestions({forceOfficial=false}={}) {
  const expanded = getExpandedQuestions().map(q => ({ ...q, storage: 'editorial' }));
  let official=[];
  try {
    official=await getOfficialFgvQuestions({force:forceOfficial});
    officialLoadError=null;
  } catch (error) {
    officialLoadError=error;
    console.warn('Provas oficiais FGV indisponíveis nesta carga; mantendo banco editorial local.', error);
  }
  return [...expanded,...official];
}

export async function getAllQuestions(options = {}) {
  await calibrateBuiltins();
  const [editorial, local, cloud] = await Promise.all([
    getOfflineEditorialQuestions({forceOfficial:Boolean(options.force)}),
    getLocalQuestions().catch(() => []),
    getCloudQuestions(options).catch(() => [])
  ]);
  const merged = new Map(editorial.map(q => [q.id, q]));
  local.forEach(q => merged.set(q.id, { ...q, storage: 'local' }));
  cloud.forEach(q => merged.set(q.id, { ...q, storage: 'central' }));
  return prepareBank([...merged.values()]);
}

export async function getQuestionBankBreakdown(options={}) {
  const editorialSeed = Array.isArray(window.OAB_QUESTIONS) ? window.OAB_QUESTIONS.length : 0;
  const editorialExpanded = EXPANDED_QUESTION_COUNT;
  const [editorial, local, cloud] = await Promise.all([
    getOfflineEditorialQuestions({forceOfficial:Boolean(options.force)}),
    getLocalQuestions().catch(() => []),
    getCloudQuestions(options).catch(() => [])
  ]);
  const official = editorial.filter(q=>q.official&&q.origin==='official-fgv').length;
  const mergedExternal = new Map();
  editorial.forEach(q => mergedExternal.set(q.id, q));
  local.forEach(q => mergedExternal.set(q.id, q));
  cloud.forEach(q => mergedExternal.set(q.id, q));
  return {
    builtin: editorialSeed + editorialExpanded + official,
    editorialSeed,
    editorialExpanded,
    official,
    officialTarget:OFFICIAL_FGV_QUESTION_TARGET,
    officialLoadError:officialLoadError ? String(officialLoadError.message||officialLoadError) : null,
    local: local.length,
    central: cloud.length,
    externalUnique: mergedExternal.size,
    total: editorialSeed + mergedExternal.size
  };
}

export async function countQuestions() {
  const data = await getQuestionBankBreakdown();
  return data.total;
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

export function invalidateCloudCache() {
  cloudCache = null;
  cloudCacheAt = 0;
}

export function invalidateOfficialFgvCache(){
  clearOfficialFgvCache();
  officialLoadError=null;
}
