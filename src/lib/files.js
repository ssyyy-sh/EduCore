/*
 * Stores uploaded files in the browser (IndexedDB), so a submitted PDF or photo
 * can be opened later on the same device. In production, files go to a server.
 */
const DB = 'educore-files';
const STORE = 'files';
export const MAX_FILE_MB = 5;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-indexeddb'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

/** Save a File; returns its metadata { id, name, size, type }. */
export async function saveFile(file) {
  const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await tx('readwrite', (s) => s.put(file, id));
  return { id, name: file.name, size: file.size, type: file.type };
}

export async function getFile(id) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** Open a stored file in a new tab (or download it if the browser blocks that). */
export async function openFile(meta) {
  const blob = await getFile(meta.id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  if (!/^(image\/|application\/pdf)/.test(meta.type)) a.download = meta.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

export const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
