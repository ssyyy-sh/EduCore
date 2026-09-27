// Verifies every translation key used in the code exists in en, ru and uz,
// and that the three dictionaries have the same shape.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const load = async (l) => (await import(`../src/i18n/${l}.js`)).default;
const dicts = { en: await load('en'), ru: await load('ru'), uz: await load('uz') };
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(f) && !p.includes('/i18n/')) out.push(p);
  }
  return out;
}
const keys = new Set();
for (const f of walk('src')) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) keys.add(m[1]);
}
// dynamic keys
const dyn = {
  'nav.': ['overview', 'schedule', 'assignments', 'grades', 'progress', 'messages', 'notifications', 'settings', 'students', 'analytics', 'gradebook', 'attendance', 'staff', 'announcements', 'meetings', 'behavior'],
  'attendance.': ['present', 'late', 'absent'],
  'owner.roleHint.': ['student', 'parent', 'teacher', 'school'],
  'owner.accounts.': ['student', 'parent', 'teacher', 'school'],
  'attendance.short.': ['present', 'late', 'absent'],
  'announcements.aud.': ['all', 'students', 'parents', 'teachers'],
  'roles.': ['student', 'parent', 'teacher', 'school', 'schoolShort', 'owner', 'pending'],
  'auth.login.': ['errUnconfirmed', 'errBlocked', 'errNetwork', 'errInvalid'],
  'status.': ['Completed', 'Pending', 'Overdue', 'Active', 'At risk', 'On leave', 'Inactive'],
  'theme.': ['system', 'light', 'dark'],
  'time.': ['morning', 'afternoon', 'evening'],
  'settings.sections.': ['profile', 'notifications', 'appearance', 'security', 'roles'],
  'settings.pages.': ['student', 'parent', 'teacher', 'school', 'students', 'analytics', 'assignments', 'grades', 'schedule', 'progress', 'messages', 'notifications', 'settings', 'staff', 'gradebook', 'attendance', 'report-card', 'announcements', 'owner', 'meetings', 'behavior'],
  'settings.notifItems.': ['assignment', 'grade', 'schedule', 'announcement', 'message', 'attendance', 'behavior'],
  'behavior.kind.': ['praise', 'remark'],
  'behavior.cat.': ['participation', 'help', 'achievement', 'effort', 'homework', 'late', 'disruption', 'unprepared'],
  'notifications.types.': ['all', 'assignment', 'grade', 'schedule', 'announcement'],
  'notifications.groups.': ['Today', 'Earlier'],
  'landing.nav.': ['platform', 'students', 'parents', 'schools', 'features', 'pricing'],
  'landing.footer.': ['product', 'solutions', 'account', 'platform', 'features', 'security', 'pricing', 'forStudents', 'forParents', 'forSchools', 'faq', 'signIn', 'createAccount'],
  'landing.mock.': ['overview', 'orgTerm', 'search', 'totalStudents', 'attendance', 'performance', 'active', 'perfCard', 'attCard', 'byYear', 'student', 'class', 'grade', 'progress', 'status', 'greeting', 'greetingSub', 'avgGrade', 'completed', 'upcoming', 'today', 'tasks', 'due'],
  'table.': ['name', 'class', 'grade', 'attendance', 'progress', 'status', 'lt90', 'b90', 'gte95', 'lt70', 'b70', 'gte85'],
  'auth.register.types.': ['student', 'parent', 'teacher', 'school'],
  'weekdays.': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  'weekdaysShort.': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  'months.': ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
};
for (const [p, list] of Object.entries(dyn)) list.forEach((k) => keys.add(p + k));
// subjects / types used in mock data
const mock = readFileSync('src/data/mock.js', 'utf8') + readFileSync('src/pages/TeacherDashboard.jsx', 'utf8') + readFileSync('src/components/landing/DashboardPreview.jsx', 'utf8');
const subjects = ['Mathematics', 'English Literature', 'English', 'Physics', 'Chemistry', 'Biology', 'Science', 'History', 'Geography', 'Computer Science', 'Economics', 'Art & Design', 'Art', 'Music', 'Physical Education', 'French', 'Reading', 'Languages', 'Algebra I', 'Geometry', 'Pre-calculus'];
subjects.forEach((s) => keys.add(`subjects.${s}`));
for (const m of mock.matchAll(/'(Homework|Essay|Lab report|Project|Reading|Quiz|Worksheet|Portfolio)'/g)) keys.add(`types.${m[1]}`);

let problems = 0;
for (const k of [...keys].sort()) {
  for (const l of ['en', 'ru', 'uz']) {
    if (get(dicts[l], k) === undefined) {
      console.log(`MISSING ${l}: ${k}`);
      problems++;
    }
  }
}
// shape parity
function shape(o, p = '', out = {}) {
  if (Array.isArray(o)) { out[p] = `array:${o.length}`; o.forEach((v, i) => typeof v === 'object' && shape(v, `${p}[${i}]`, out)); }
  else if (o && typeof o === 'object') {
    const isPlural = 'other' in o;
    if (isPlural) out[p] = 'plural';
    else for (const k of Object.keys(o)) shape(o[k], p ? `${p}.${k}` : k, out);
  } else out[p] = 'str';
  return out;
}
const se = shape(dicts.en);
for (const l of ['ru', 'uz']) {
  const sl = shape(dicts[l]);
  for (const k of Object.keys(se)) if (se[k] !== sl[k]) { console.log(`SHAPE ${l}: ${k} en=${se[k]} ${l}=${sl[k]}`); problems++; }
  for (const k of Object.keys(sl)) if (!(k in se)) { console.log(`EXTRA ${l}: ${k}`); problems++; }
}
// unused (informational)
const usedPrefixes = [...keys];
const unused = Object.keys(se).filter((k) => !usedPrefixes.some((u) => k === u || k.startsWith(u + '.') || k.startsWith(u + '[')));
console.log(`checked ${keys.size} keys; problems: ${problems}; unused en keys: ${unused.length}`);
if (unused.length) console.log('unused:', unused.join(', '));
process.exit(problems ? 1 : 0);
