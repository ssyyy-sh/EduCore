import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

/*
 * Server mode. When SUPABASE_URL and SUPABASE_ANON_KEY are set in src/config.js
 * (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time), accounts and school data
 * live in Supabase and are shared by every device. Otherwise the app runs as a browser-only demo.
 */
const url = String(SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = String(SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const REMOTE = Boolean(url && key);

export const supabase = REMOTE
  ? createClient(url, key, {
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'educore.auth' },
    })
  : null;

/** Address to come back to from confirmation / password-reset emails. */
export const siteUrl = () => (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`);

/** Read every row of a table, 1000 at a time (Supabase returns at most 1000 rows per request). */
export async function fetchAll(table, build = (q) => q, orderBy = []) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    let q = build(supabase.from(table).select('*'));
    for (const col of orderBy) q = q.order(col, { ascending: true });
    const { data, error } = await q.range(from, from + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}
