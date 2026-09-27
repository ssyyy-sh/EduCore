/*
 * Files of submitted work. Demo mode: kept in this browser (IndexedDB).
 * Server mode: uploaded to Supabase Storage (bucket "submissions"), opened through a short-lived link.
 */
import { REMOTE, supabase } from './supabase.js';

const BUCKET = 'submissions';
const safeName = (n) => String(n).normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-80) || 'file';
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
  if (REMOTE) {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) throw new Error('not-signed-in');
    const path = `${uid}/${id}-${safeName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) throw error;
    return { id, name: file.name, size: file.size, type: file.type, path };
  }
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
function openUrl(url, meta, download) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  if (download) a.download = meta.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function openFile(meta) {
  if (meta.path) {
    if (!REMOTE) return false;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(meta.path, 600);
    if (error || !data?.signedUrl) return false;
    openUrl(data.signedUrl, meta, false);
    return true;
  }
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

/** Delete every stored file (used by the Owner's "reset demo data"). */
export function clearFiles() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve();
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
