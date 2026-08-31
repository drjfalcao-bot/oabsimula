const DB_NAME = 'oab-aprova-question-bank';
const DB_VERSION = 1;
const STORE = 'questions';

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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
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
