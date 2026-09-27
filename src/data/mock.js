/* ==========================================================
   Demo data for EduCore — one fictional organisation
   (Northbridge Academy): 4,862 students, 327 teachers, 186 classes.
   Generated deterministically so numbers are stable between reloads.
   Text shown to users is stored as { en, ru, uz }.
   ========================================================== */

export const L = (en, ru, uz) => ({ en, ru, uz });

// ---------- deterministic RNG ----------
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260926);
const pick = (arr, r = rand) => arr[Math.floor(r() * arr.length)];
const between = (min, max, r = rand) => min + r() * (max - min);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = (v) => Math.round(v * 10) / 10;

// ---------- dates ----------
export const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
const minutesAgo = (m) => new Date(Date.now() - m * 60000);

export const ORG = {
  name: 'Northbridge Academy',
  term: L('Autumn term 2026', 'I четверть 2026', '2026-yil 1-chorak'),
  capacity: 5000,
};

export const KPIS = {
  teachers: 327,
  classes: 186,
  performance: 87.4,
  attendance: 94.8,
};

// ---------- names ----------
const FIRST = [
  'Alex', 'Emma', 'Daniel', 'Sofia', 'Liam', 'Mia', 'Noah', 'Ava', 'Leo', 'Isla', 'Adam', 'Zara', 'Ethan', 'Lucy',
  'Omar', 'Chloe', 'Arjun', 'Hannah', 'Mateo', 'Grace', 'Yusuf', 'Ella', 'Kai', 'Amelia', 'Ryan', 'Nora', 'Samir',
  'Layla', 'Jonas', 'Freya', 'Tariq', 'Maya', 'Lucas', 'Aisha', 'Felix', 'Ivy', 'Hugo', 'Leila', 'Oscar', 'Anna',
  'Timur', 'Elif', 'Max', 'Yara', 'Ben', 'Sara', 'Theo', 'Nadia', 'Jack', 'Alina', 'Aziz', 'Clara', 'Rafael',
  'Madina', 'Luca', 'Julia', 'Dilan', 'Rosa', 'Emil', 'Kira', 'Sami', 'Vera', 'Nikolai', 'Lina', 'Jamal', 'Iris',
];
const LAST = [
  'Morgan', 'Carter', 'Kim', 'Novak', 'Rahimov', 'Bennett', 'Silva', 'Nguyen', 'Fischer', 'Patel', 'Hughes', 'Park',
  'Karimova', 'Reyes', 'Walsh', 'Ivanova', 'Hassan', 'Laurent', 'Tanaka', 'Brooks', 'Aliyev', 'Moreau', 'Chen',
  'Yusupov', 'Schmidt', 'Rossi', 'Khan', 'Sato', 'Petrov', 'Murphy', 'Lindqvist', 'Costa', 'Ahmed', 'Wright',
  'Tursunova', 'Duarte', 'Olsen', 'Bauer', 'Okafor', 'Levi', 'Haddad', 'Kowalski', 'Ward', 'Ismoilov', 'Vega',
];

export const initialsOf = (name) =>
  String(name)
    .replace(/^(Mr\.|Ms\.|Dr\.)\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const toneOf = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `tone-${(h % 5) + 1}`;
};

// ---------- classes: 12 year groups, 186 classes ----------
const SECTIONS = 'ABCDEFGHIJKLMNOP'.split('');
export const CLASSES = [];
for (let g = 1; g <= 12; g++) {
  const n = g <= 6 ? 16 : 15;
  for (let s = 0; s < n; s++) CLASSES.push({ name: `${g}-${SECTIONS[s]}`, grade: g });
}
export const GRADE_LEVELS = Array.from({ length: 12 }, (_, i) => i + 1);
export const STATUSES = ['Active', 'At risk', 'On leave', 'Inactive'];
const TOTAL_STUDENTS = 4862;

// ---------- students (4,862) ----------
function buildStudents() {
  const list = [];
  const base = Math.floor(TOTAL_STUDENTS / CLASSES.length); // 26
  let remainder = TOTAL_STUDENTS - base * CLASSES.length; // 26
  let id = 1;
  CLASSES.forEach((cls, ci) => {
    const extra = remainder > 0 && ci % 7 === 0 ? 1 : 0;
    if (extra) remainder--;
    for (let i = 0; i < base + extra; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      const ability = between(0, 1);
      list.push({
        id: `NB-${String(24000 + id).padStart(5, '0')}`,
        name: `${first} ${last}`,
        email: `${first}.${last}.${id}`.toLowerCase() + '@northbridge.edu',
        className: cls.name,
        grade: cls.grade,
        score: round1(clamp(62 + ability * 36 + between(-5, 5), 51, 99.6)),
        attendance: round1(clamp(86 + ability * 12 + between(-6, 3), 71, 100)),
        progress: Math.round(clamp(48 + ability * 48 + between(-10, 8), 22, 100)),
        status: 'Active',
        guardian: `${pick(FIRST)} ${last}`,
      });
      id++;
    }
  });
  // Top up any shortfall so the roster is exactly 4,862.
  let ci = 0;
  while (list.length < TOTAL_STUDENTS) {
    const cls = CLASSES[ci++ % CLASSES.length];
    const first = pick(FIRST);
    const last = pick(LAST);
    list.push({
      id: `NB-${String(24000 + id).padStart(5, '0')}`,
      name: `${first} ${last}`,
      email: `${first}.${last}.${id}`.toLowerCase() + '@northbridge.edu',
      className: cls.name,
      grade: cls.grade,
      score: 84.2,
      attendance: 95.1,
      progress: 80,
      status: 'Active',
      guardian: `${pick(FIRST)} ${last}`,
    });
    id++;
  }
  // Weakest 214 are "At risk"; then 58 "On leave" and 69 "Inactive" → 4,521 active.
  const weak = [...list.keys()].sort((a, b) => list[a].score + list[a].attendance - (list[b].score + list[b].attendance));
  weak.slice(0, 214).forEach((i) => (list[i].status = 'At risk'));
  const r2 = mulberry32(77);
  const order = list.map((_, i) => i).sort(() => r2() - 0.5);
  let k = 0;
  for (const [status, count] of [
    ['On leave', 58],
    ['Inactive', 69],
  ]) {
    let placed = 0;
    while (placed < count) {
      const i = order[k++];
      if (list[i].status === 'Active') {
        list[i].status = status;
        placed++;
      }
    }
  }
  return list;
}
export const STUDENTS = buildStudents();

// ---------- rooms ----------
const ROOM = {
  gym: L('Gym', 'Спортзал', 'Sport zali'),
  studio: L('Studio', 'Студия', 'Studiya'),
  lab1: L('Lab 1', 'Лаб. 1', 'Lab. 1'),
  lab2: L('Lab 2', 'Лаб. 2', 'Lab. 2'),
  lab3: L('Lab 3', 'Лаб. 3', 'Lab. 3'),
};

// ---------- student (Alex) ----------
export const STUDENT_STATS = { avgGrade: 4.8, attendance: 94, progress: 82, completed: 28 };

const A = (id, title, subject, teacher, offset, status, type, weight) => ({ id, title, subject, teacher, due: addDays(TODAY, offset), status, type, weight });
export const ASSIGNMENTS = [
  A('a1', L('Quadratic equations — problem set 4', 'Квадратные уравнения — задачи 4', 'Kvadrat tenglamalar — 4-masalalar'), 'Mathematics', 'Mr. Hayes', 1, 'Pending', 'Homework', '5%'),
  A('a2', L('Essay: symbolism in “Lord of the Flies”', 'Эссе: символизм в «Повелителе мух»', 'Insho: “Pashshalar hukmdori”dagi ramzlar'), 'English Literature', 'Ms. Laurent', 3, 'Pending', 'Essay', '15%'),
  A('a3', L('Lab report: Ohm’s law', 'Лабораторная: закон Ома', 'Laboratoriya ishi: Om qonuni'), 'Physics', 'Dr. Tanaka', 4, 'Pending', 'Lab report', '10%'),
  A('a4', L('Cell structure diagram', 'Схема строения клетки', 'Hujayra tuzilishi sxemasi'), 'Biology', 'Ms. Okafor', 6, 'Pending', 'Project', '10%'),
  A('a5', L('Chapter 3 reading notes', 'Конспект главы 3', '3-bob konspekti'), 'History', 'Mr. Walsh', -2, 'Overdue', 'Reading', '5%'),
  A('a6', L('Vocabulary quiz prep — unit 2', 'Подготовка к словарному тесту — раздел 2', 'Lug‘at testiga tayyorgarlik — 2-bo‘lim'), 'French', 'Ms. Moreau', -1, 'Overdue', 'Quiz', '5%'),
  A('a7', L('Python loops exercises', 'Упражнения на циклы в Python', 'Python sikllari bo‘yicha mashqlar'), 'Computer Science', 'Mr. Park', 9, 'Pending', 'Homework', '5%'),
  A('a8', L('Supply and demand worksheet', 'Рабочий лист: спрос и предложение', 'Ish varag‘i: talab va taklif'), 'Economics', 'Ms. Reyes', 11, 'Pending', 'Worksheet', '5%'),
  A('a9', L('Linear functions — problem set 3', 'Линейные функции — задачи 3', 'Chiziqli funksiyalar — 3-masalalar'), 'Mathematics', 'Mr. Hayes', -6, 'Completed', 'Homework', '5%'),
  A('a10', L('Poetry analysis: “Ozymandias”', 'Анализ стихотворения «Озимандия»', '“Ozimandiya” she’rini tahlil qilish'), 'English Literature', 'Ms. Laurent', -8, 'Completed', 'Essay', '15%'),
  A('a11', L('Periodic table quiz', 'Тест по таблице Менделеева', 'Mendeleyev jadvali testi'), 'Chemistry', 'Dr. Kowalski', -5, 'Completed', 'Quiz', '5%'),
  A('a12', L('River systems case study', 'Кейс: речные системы', 'Keys: daryo tizimlari'), 'Geography', 'Mr. Costa', -9, 'Completed', 'Project', '10%'),
  A('a13', L('Density lab — data table', 'Лабораторная по плотности — таблица данных', 'Zichlik laboratoriyasi — ma’lumotlar jadvali'), 'Physics', 'Dr. Tanaka', -11, 'Completed', 'Lab report', '10%'),
  A('a14', L('Industrial Revolution timeline', 'Хронология промышленной революции', 'Sanoat inqilobi xronologiyasi'), 'History', 'Mr. Walsh', -13, 'Completed', 'Project', '10%'),
  A('a15', L('Still-life charcoal study', 'Натюрморт углём', 'Ko‘mir bilan natyurmort'), 'Art & Design', 'Ms. Lindqvist', -4, 'Completed', 'Portfolio', '10%'),
  A('a16', L('HTML basics mini-site', 'Мини-сайт на основах HTML', 'HTML asoslarida mini-sayt'), 'Computer Science', 'Mr. Park', -15, 'Completed', 'Project', '10%'),
  A('a17', L('Molar mass practice', 'Практика: молярная масса', 'Amaliyot: molyar massa'), 'Chemistry', 'Dr. Kowalski', 2, 'Pending', 'Homework', '5%'),
  A('a18', L('Photosynthesis short answers', 'Фотосинтез: короткие ответы', 'Fotosintez: qisqa javoblar'), 'Biology', 'Ms. Okafor', -16, 'Completed', 'Homework', '5%'),
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const S = (start, end, subject, teacher, room) => ({ start, end, subject, teacher, room });
export const SCHEDULE = {
  Monday: [
    S('08:30', '09:15', 'Mathematics', 'Mr. Hayes', 'B204'),
    S('09:25', '10:10', 'English Literature', 'Ms. Laurent', 'A112'),
    S('10:30', '11:15', 'Physics', 'Dr. Tanaka', ROOM.lab3),
    S('11:25', '12:10', 'History', 'Mr. Walsh', 'A108'),
    S('13:00', '13:45', 'French', 'Ms. Moreau', 'C015'),
    S('13:55', '14:40', 'Physical Education', 'Mr. Brooks', ROOM.gym),
  ],
  Tuesday: [
    S('08:30', '09:15', 'Chemistry', 'Dr. Kowalski', ROOM.lab1),
    S('09:25', '10:10', 'Mathematics', 'Mr. Hayes', 'B204'),
    S('10:30', '11:15', 'Biology', 'Ms. Okafor', ROOM.lab2),
    S('11:25', '12:10', 'Computer Science', 'Mr. Park', 'D301'),
    S('13:00', '13:45', 'Geography', 'Mr. Costa', 'A104'),
  ],
  Wednesday: [
    S('08:30', '09:15', 'English Literature', 'Ms. Laurent', 'A112'),
    S('09:25', '10:10', 'Physics', 'Dr. Tanaka', ROOM.lab3),
    S('10:30', '11:15', 'Mathematics', 'Mr. Hayes', 'B204'),
    S('11:25', '12:10', 'Economics', 'Ms. Reyes', 'C210'),
    S('13:00', '13:45', 'Art & Design', 'Ms. Lindqvist', ROOM.studio),
    S('13:55', '14:40', 'Art & Design', 'Ms. Lindqvist', ROOM.studio),
  ],
  Thursday: [
    S('08:30', '09:15', 'Biology', 'Ms. Okafor', ROOM.lab2),
    S('09:25', '10:10', 'History', 'Mr. Walsh', 'A108'),
    S('10:30', '11:15', 'Mathematics', 'Mr. Hayes', 'B204'),
    S('11:25', '12:10', 'French', 'Ms. Moreau', 'C015'),
    S('13:00', '13:45', 'Chemistry', 'Dr. Kowalski', ROOM.lab1),
  ],
  Friday: [
    S('08:30', '09:15', 'Computer Science', 'Mr. Park', 'D301'),
    S('09:25', '10:10', 'English Literature', 'Ms. Laurent', 'A112'),
    S('10:30', '11:15', 'Geography', 'Mr. Costa', 'A104'),
    S('11:25', '12:10', 'Music', 'Ms. Silva', 'M01'),
    S('13:00', '13:45', 'Physical Education', 'Mr. Brooks', ROOM.gym),
  ],
};

/** Today's weekday key, or Monday (flagged) at weekends. */
export function todayKey() {
  const d = new Date().getDay();
  if (d >= 1 && d <= 5) return { day: WEEKDAYS[d - 1], isToday: true };
  return { day: 'Monday', isToday: false };
}

export const SUBJECT_GRADES = [
  { subject: 'Mathematics', teacher: 'Mr. Hayes', grade: 5, average: 4.9, change: 0.2 },
  { subject: 'English Literature', teacher: 'Ms. Laurent', grade: 5, average: 4.8, change: 0.1 },
  { subject: 'Physics', teacher: 'Dr. Tanaka', grade: 5, average: 4.7, change: 0.3 },
  { subject: 'Chemistry', teacher: 'Dr. Kowalski', grade: 4, average: 4.6, change: -0.1 },
  { subject: 'Biology', teacher: 'Ms. Okafor', grade: 5, average: 4.9, change: 0.0 },
  { subject: 'History', teacher: 'Mr. Walsh', grade: 4, average: 4.5, change: -0.2 },
  { subject: 'Computer Science', teacher: 'Mr. Park', grade: 5, average: 5.0, change: 0.1 },
  { subject: 'French', teacher: 'Ms. Moreau', grade: 5, average: 4.7, change: 0.2 },
  { subject: 'Geography', teacher: 'Mr. Costa', grade: 5, average: 4.8, change: 0.0 },
];

export const RECENT_GRADES = [
  { id: 'g1', subject: 'Mathematics', work: ASSIGNMENTS[8].title, grade: 5, date: addDays(TODAY, -3) },
  { id: 'g2', subject: 'Chemistry', work: ASSIGNMENTS[10].title, grade: 4, date: addDays(TODAY, -4) },
  { id: 'g3', subject: 'English Literature', work: ASSIGNMENTS[9].title, grade: 5, date: addDays(TODAY, -5) },
  { id: 'g4', subject: 'Art & Design', work: ASSIGNMENTS[14].title, grade: 5, date: addDays(TODAY, -6) },
  { id: 'g5', subject: 'Geography', work: ASSIGNMENTS[11].title, grade: 5, date: addDays(TODAY, -8) },
];

// Monthly averages, school year 2025–26 (5-point scale).
export const GRADE_HISTORY = [
  { month: 'Sep', you: 4.5, cls: 4.2 },
  { month: 'Oct', you: 4.6, cls: 4.2 },
  { month: 'Nov', you: 4.5, cls: 4.3 },
  { month: 'Dec', you: 4.7, cls: 4.3 },
  { month: 'Jan', you: 4.6, cls: 4.2 },
  { month: 'Feb', you: 4.7, cls: 4.3 },
  { month: 'Mar', you: 4.8, cls: 4.3 },
  { month: 'Apr', you: 4.7, cls: 4.4 },
  { month: 'May', you: 4.8, cls: 4.4 },
  { month: 'Jun', you: 4.9, cls: 4.4 },
];
export const AUTUMN_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec'];
export const SPRING_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const SUBJECT_PROGRESS = [
  { subject: 'Mathematics', value: 88, done: 22, total: 25 },
  { subject: 'English Literature', value: 84, done: 16, total: 19 },
  { subject: 'Physics', value: 79, done: 15, total: 19 },
  { subject: 'Chemistry', value: 72, done: 13, total: 18 },
  { subject: 'Biology', value: 86, done: 18, total: 21 },
  { subject: 'History', value: 74, done: 14, total: 19 },
  { subject: 'Computer Science', value: 92, done: 12, total: 13 },
];

// Weekly study hours in September (weeks start on these dates).
export const WEEKLY_ACTIVITY = [
  { week: new Date(2026, 8, 1), hours: 11.5 },
  { week: new Date(2026, 8, 7), hours: 13.0 },
  { week: new Date(2026, 8, 14), hours: 12.2 },
  { week: new Date(2026, 8, 21), hours: 14.6 },
];
export const GOAL_PROGRESS = [60, 67, 100];

// ---------- parent ----------
export const CHILDREN = [
  {
    id: 'alex',
    name: 'Alex',
    full: 'Alex Morgan',
    className: '9-A',
    avgGrade: 4.8,
    attendance: 94,
    progress: 82,
    assignments: { done: 28, pending: 6, overdue: 2 },
    trend: [4.5, 4.6, 4.5, 4.7, 4.6, 4.7, 4.8, 4.7, 4.8, 4.9],
    recent: RECENT_GRADES.slice(0, 4),
    tutor: 'Mr. Hayes',
    upcoming: ['a5', 'a6', 'a1', 'a17'],
  },
  {
    id: 'emma',
    name: 'Emma',
    full: 'Emma Morgan',
    className: '6-C',
    avgGrade: 4.6,
    attendance: 97,
    progress: 88,
    assignments: { done: 21, pending: 3, overdue: 0 },
    trend: [4.3, 4.4, 4.4, 4.5, 4.5, 4.4, 4.6, 4.6, 4.5, 4.6],
    recent: [
      { id: 'e1', subject: 'Mathematics', work: L('Fractions review', 'Повторение дробей', 'Kasrlarni takrorlash'), grade: 5, date: addDays(TODAY, -2) },
      { id: 'e2', subject: 'English', work: L('Book report: “Holes”', 'Отзыв о книге «Ямы»', '“Chuqurlar” kitobi haqida taqriz'), grade: 4, date: addDays(TODAY, -3) },
      { id: 'e3', subject: 'Science', work: L('Plant growth journal', 'Дневник роста растений', 'O‘simlik o‘sishi kundaligi'), grade: 5, date: addDays(TODAY, -6) },
      { id: 'e4', subject: 'History', work: L('Ancient Egypt poster', 'Плакат о Древнем Египте', 'Qadimgi Misr haqida plakat'), grade: 5, date: addDays(TODAY, -9) },
    ],
    tutor: 'Ms. Silva',
    upcoming: [],
  },
  {
    id: 'daniel',
    name: 'Daniel',
    full: 'Daniel Morgan',
    className: '3-B',
    avgGrade: 4.3,
    attendance: 91,
    progress: 76,
    assignments: { done: 14, pending: 4, overdue: 1 },
    trend: [4.0, 4.1, 4.2, 4.1, 4.3, 4.2, 4.2, 4.3, 4.4, 4.3],
    recent: [
      { id: 'd1', subject: 'Reading', work: L('Weekly reading log', 'Дневник чтения за неделю', 'Haftalik o‘qish kundaligi'), grade: 4, date: addDays(TODAY, -1) },
      { id: 'd2', subject: 'Mathematics', work: L('Times tables — 7s', 'Таблица умножения на 7', '7 ga ko‘paytirish jadvali'), grade: 5, date: addDays(TODAY, -4) },
      { id: 'd3', subject: 'Science', work: L('Weather diary', 'Дневник погоды', 'Ob-havo kundaligi'), grade: 4, date: addDays(TODAY, -7) },
      { id: 'd4', subject: 'Art', work: L('Autumn leaves collage', 'Коллаж из осенних листьев', 'Kuzgi barglar kollaji'), grade: 5, date: addDays(TODAY, -8) },
    ],
    tutor: 'Ms. Hughes',
    upcoming: [],
  },
];

// ---------- teacher ----------
export const TEACHER_CLASSES = [
  { name: '9-A', subject: 'Algebra I', attendance: 92, avg: 84, next: { day: 'Monday', time: '08:30', room: 'B204' } },
  { name: '9-C', subject: 'Algebra I', attendance: 95, avg: 81, next: { day: 'Monday', time: '11:25', room: 'B204' } },
  { name: '10-B', subject: 'Geometry', attendance: 90, avg: 78, next: { day: 'Tuesday', time: '09:25', room: 'B206' } },
  { name: '11-A', subject: 'Pre-calculus', attendance: 94, avg: 86, next: { day: 'Wednesday', time: '10:30', room: 'B204' } },
];
export const TEACHER_SUBMISSIONS = [
  { id: 's1', title: L('Quadratic equations — PS4', 'Квадратные уравнения — задачи 4', 'Kvadrat tenglamalar — 4-masalalar'), cls: '9-A', submitted: 19, total: 27, due: addDays(TODAY, 1) },
  { id: 's2', title: L('Triangle congruence proofs', 'Доказательства равенства треугольников', 'Uchburchaklar tengligini isbotlash'), cls: '10-B', submitted: 24, total: 26, due: addDays(TODAY, 2) },
  { id: 's3', title: L('Limits introduction', 'Введение в пределы', 'Limitlarga kirish'), cls: '11-A', submitted: 11, total: 26, due: addDays(TODAY, 4) },
  { id: 's4', title: L('Linear functions — PS3', 'Линейные функции — задачи 3', 'Chiziqli funksiyalar — 3-masalalar'), cls: '9-C', submitted: 26, total: 26, due: addDays(TODAY, -3) },
];
export const TEACHER_ATTENDANCE_WEEK = [
  { day: 'Monday', present: 25 },
  { day: 'Tuesday', present: 24 },
  { day: 'Wednesday', present: 26 },
  { day: 'Thursday', present: 23 },
  { day: 'Friday', present: 24 },
];
export const GRADE_DISTRIBUTION = [
  { band: '<60', count: 1 },
  { band: '60–69', count: 2 },
  { band: '70–79', count: 6 },
  { band: '80–89', count: 11 },
  { band: '90–100', count: 7 },
];

// ---------- school analytics ----------
export const PERFORMANCE_TREND = [
  { month: 'Sep', performance: 84.1, target: 85, attendance: 95.9 },
  { month: 'Oct', performance: 84.9, target: 85, attendance: 95.2 },
  { month: 'Nov', performance: 85.3, target: 85.5, attendance: 94.6 },
  { month: 'Dec', performance: 85.0, target: 85.5, attendance: 92.8 },
  { month: 'Jan', performance: 85.8, target: 86, attendance: 93.4 },
  { month: 'Feb', performance: 86.2, target: 86, attendance: 94.1 },
  { month: 'Mar', performance: 86.7, target: 86.5, attendance: 94.9 },
  { month: 'Apr', performance: 86.5, target: 86.5, attendance: 94.7 },
  { month: 'May', performance: 87.1, target: 87, attendance: 95.3 },
  { month: 'Jun', performance: 87.4, target: 87, attendance: 94.8 },
];
export const ATTENDANCE_BY_GRADE = GRADE_LEVELS.map((g) => {
  const inGrade = STUDENTS.filter((s) => s.grade === g);
  const avg = inGrade.reduce((a, s) => a + s.attendance, 0) / inGrade.length;
  return { grade: g, attendance: round1(avg), students: inGrade.length };
});
export const ASSIGNMENTS_COMPLETED = [
  { week: new Date(2026, 7, 31), completed: 6120, assigned: 6840 },
  { week: new Date(2026, 8, 7), completed: 8940, assigned: 9660 },
  { week: new Date(2026, 8, 14), completed: 9480, assigned: 10120 },
  { week: new Date(2026, 8, 21), completed: 9810, assigned: 10390 },
];
export const ACTIVE_STUDENTS_TREND = [
  { month: 'Sep', active: 4388 },
  { month: 'Oct', active: 4412 },
  { month: 'Nov', active: 4430 },
  { month: 'Dec', active: 4295 },
  { month: 'Jan', active: 4447 },
  { month: 'Feb', active: 4469 },
  { month: 'Mar', active: 4484 },
  { month: 'Apr', active: 4476 },
  { month: 'May', active: 4502 },
  { month: 'Jun', active: 4521 },
];
export const SUBJECT_PERFORMANCE = [
  { subject: 'Mathematics', score: 85.2 },
  { subject: 'English', score: 88.6 },
  { subject: 'Science', score: 86.1 },
  { subject: 'History', score: 87.9 },
  { subject: 'Languages', score: 89.3 },
  { subject: 'Computer Science', score: 90.4 },
];
export const ACTIVITY_LOG = [
  { id: 'l1', who: 'Ms. Laurent', text: L('published grades for Essay 1 · 9-A', 'выставила оценки за эссе 1 · 9-A', 'Insho 1 · 9-A uchun baholarni e’lon qildi'), at: minutesAgo(12) },
  { id: 'l2', who: 'Admissions', text: L('enrolled 3 students into Year 7', 'зачислила 3 учеников в 7 класс', '7-sinfga 3 nafar o‘quvchini qabul qildi'), at: minutesAgo(48) },
  { id: 'l3', who: 'Mr. Hayes', text: L('marked attendance for 9-C', 'отметил посещаемость 9-C', '9-C davomatini belgiladi'), at: minutesAgo(64) },
  { id: 'l4', who: 'Olivia Chen', text: L('added 2 teachers to Mathematics', 'добавила 2 учителей на кафедру математики', 'Matematika kafedrasiga 2 o‘qituvchi qo‘shdi'), at: minutesAgo(130) },
];

// ---------- messages ----------
const M = (id, from, role, subject, body, at, unread, box = 'inbox', audience = ['student']) => ({ id, from, role, subject, body, at, unread, box, audience });
export const MESSAGES = [
  M(
    'm1', 'Mr. Daniel Hayes', 'Teacher',
    L('Problem set 4 — extra practice', 'Задачи 4 — дополнительная практика', '4-masalalar — qo‘shimcha mashq'),
    L(
      'Hi Alex,\n\nI’ve added two extra problems on completing the square. They are optional but will help before Friday’s quiz. If anything in section 4.3 is unclear, come by B204 during lunch on Wednesday.\n\nBest,\nMr. Hayes',
      'Привет, Alex!\n\nЯ добавил две дополнительные задачи на выделение полного квадрата. Они необязательные, но помогут перед тестом в пятницу. Если что-то в разделе 4.3 непонятно, заходи в B204 в среду на большой перемене.\n\nMr. Hayes',
      'Salom, Alex!\n\nTo‘liq kvadrat ajratish bo‘yicha ikkita qo‘shimcha masala qo‘shdim. Ular ixtiyoriy, lekin juma kungi testdan oldin foydali bo‘ladi. 4.3-bo‘limda tushunarsiz joy bo‘lsa, chorshanba tushlik paytida B204 xonasiga kel.\n\nMr. Hayes'
    ),
    minutesAgo(35), true
  ),
  M(
    'm2', 'Northbridge Academy', 'School',
    L('Parent–teacher conferences: booking open', 'Родительские собрания: запись открыта', 'Ota-onalar majlisi: yozilish ochildi'),
    L(
      'Dear families,\n\nBooking for autumn parent–teacher conferences opens today. Slots are 10 minutes each and can be booked until October 9.\n\nNorthbridge Academy Office',
      'Уважаемые родители!\n\nСегодня открывается запись на осенние родительские собрания. Каждая встреча длится 10 минут, записаться можно до 9 октября.\n\nАдминистрация Northbridge Academy',
      'Hurmatli ota-onalar!\n\nBugundan kuzgi ota-onalar majlisiga yozilish boshlanadi. Har bir uchrashuv 10 daqiqa davom etadi, 9-oktabrgacha yozilish mumkin.\n\nNorthbridge Academy ma’muriyati'
    ),
    minutesAgo(140), true, 'inbox', ['student', 'parent']
  ),
  M(
    'm3', 'Sarah Morgan', 'Parent',
    L('Pick-up on Thursday', 'Забираю в четверг', 'Payshanba kuni olib ketaman'),
    L(
      'Hi love,\n\nI’ll collect you at 15:00 on Thursday for the dentist. I’ve already let the office know, so just come to reception after Chemistry.\n\nMum',
      'Привет!\n\nВ четверг заберу тебя в 15:00 к стоматологу. Я уже предупредила администрацию, так что после химии просто подходи на ресепшен.\n\nМама',
      'Salom!\n\nPayshanba kuni soat 15:00 da seni tish shifokoriga olib ketaman. Ma’muriyatni ogohlantirdim, kimyodan keyin qabulxonaga kel.\n\nOying'
    ),
    minutesAgo(60 * 26), false
  ),
  M(
    'm4', 'Ms. Claire Laurent', 'Teacher',
    L('Essay feedback is ready', 'Отзыв на эссе готов', 'Insho bo‘yicha fikr tayyor'),
    L(
      'Hello Alex,\n\nYour “Ozymandias” analysis was excellent: a clear argument and strong evidence. I left a few comments on paragraph structure for next time. You can find them under Grades.\n\nMs. Laurent',
      'Здравствуй, Alex!\n\nТвой анализ «Озимандии» получился отличным: ясная мысль и сильные аргументы. Я оставила несколько замечаний по структуре абзацев на будущее. Их можно найти в разделе «Оценки».\n\nMs. Laurent',
      'Salom, Alex!\n\n“Ozimandiya” tahliling a’lo chiqdi: fikr aniq, dalillar kuchli. Keyingi safar uchun xatboshilar tuzilishi bo‘yicha bir nechta izoh qoldirdim. Ularni “Baholar” bo‘limida topasan.\n\nMs. Laurent'
    ),
    minutesAgo(60 * 28), false
  ),
  M(
    'm5', 'Mia Carter', 'Student',
    L('Physics lab group', 'Группа по физике', 'Fizika laboratoriyasi guruhi'),
    L(
      'Hey! Can we meet in the library at lunch to finish the data table? I have the readings from Tuesday.',
      'Привет! Давай встретимся в библиотеке на обеде и доделаем таблицу? У меня есть измерения со вторника.',
      'Salom! Tushlikda kutubxonada uchrashib, jadvalni tugatamizmi? Seshanbadagi o‘lchovlar menda.'
    ),
    minutesAgo(60 * 50), true
  ),
  M(
    'm6', 'Dr. Kenji Tanaka', 'Teacher',
    L('Lab safety form', 'Форма по технике безопасности', 'Xavfsizlik texnikasi shakli'),
    L(
      'Please make sure the signed lab safety form is uploaded before next Tuesday’s practical.',
      'Пожалуйста, загрузите подписанную форму по технике безопасности до практической работы в следующий вторник.',
      'Iltimos, keyingi seshanbadagi amaliy mashg‘ulotdan oldin imzolangan xavfsizlik shaklini yuklang.'
    ),
    minutesAgo(60 * 24 * 8), false, 'inbox', ['student', 'parent']
  ),
  M(
    'm7', 'Mr. Daniel Hayes', 'Teacher',
    L('Re: Quiz on Friday', 'Re: Тест в пятницу', 'Re: Juma kungi test'),
    L('Thank you! Will the quiz include word problems, or only equations?', 'Спасибо! В тесте будут текстовые задачи или только уравнения?', 'Rahmat! Testda matnli masalalar ham bo‘ladimi yoki faqat tenglamalar?'),
    minutesAgo(60 * 24 * 9), false, 'sent'
  ),
  M(
    'm8', 'Mia Carter', 'Student',
    L('Re: Physics lab group', 'Re: Группа по физике', 'Re: Fizika laboratoriyasi guruhi'),
    L('Sounds good, see you there at 12:15.', 'Договорились, увидимся там в 12:15.', 'Kelishdik, 12:15 da ko‘rishamiz.'),
    minutesAgo(60 * 24 * 10), false, 'sent'
  ),
  // ---- parent inbox
  M(
    'p1', 'Ms. Ana Silva', 'Teacher',
    L('Emma’s reading this term', 'Чтение Эммы в этой четверти', 'Emmaning bu chorakdagi o‘qishi'),
    L(
      'Dear Mrs Morgan,\n\nEmma has finished four books from the class list already and her book report was one of the best in 6-C. Keep encouraging her to read 20 minutes a day.\n\nMs. Silva',
      'Уважаемая миссис Морган!\n\nЭмма уже прочитала четыре книги из списка класса, а её отзыв о книге — один из лучших в 6-C. Продолжайте поддерживать её: 20 минут чтения в день.\n\nMs. Silva',
      'Hurmatli Morgan xonim!\n\nEmma sinf ro‘yxatidan to‘rtta kitobni o‘qib bo‘ldi, uning kitob haqidagi taqrizi 6-C dagi eng yaxshilaridan biri. Uni kuniga 20 daqiqa o‘qishga undashda davom eting.\n\nMs. Silva'
    ),
    minutesAgo(90), true, 'inbox', ['parent']
  ),
  M(
    'p2', 'Mr. Daniel Hayes', 'Teacher',
    L('Alex — two overdue tasks', 'Alex — два просроченных задания', 'Alex — muddati o‘tgan ikkita vazifa'),
    L(
      'Dear Mrs Morgan,\n\nAlex is doing very well in Mathematics. There are two overdue tasks in History and French this week; could you remind him to hand them in?\n\nMr. Hayes',
      'Уважаемая миссис Морган!\n\nПо математике у Alex всё отлично. На этой неделе у него два просроченных задания — по истории и французскому. Напомните ему, пожалуйста, сдать их.\n\nMr. Hayes',
      'Hurmatli Morgan xonim!\n\nAlex matematikadan juda yaxshi o‘qiyapti. Bu hafta tarix va fransuz tilidan ikkita vazifaning muddati o‘tgan; ularni topshirishni eslatib qo‘ya olasizmi?\n\nMr. Hayes'
    ),
    minutesAgo(60 * 26), false, 'inbox', ['parent']
  ),
  // ---- teacher inbox
  M(
    't1', 'Olivia Chen', 'School',
    L('Mathematics department meeting', 'Собрание кафедры математики', 'Matematika kafedrasi yig‘ilishi'),
    L(
      'Hi Daniel,\n\nThe department meeting is on Thursday at 15:00 in room B210. Please bring the mid-term results for your four classes.\n\nOlivia',
      'Привет, Daniel!\n\nСобрание кафедры — в четверг в 15:00 в кабинете B210. Возьми, пожалуйста, промежуточные результаты по своим четырём классам.\n\nOlivia',
      'Salom, Daniel!\n\nKafedra yig‘ilishi payshanba kuni soat 15:00 da B210 xonasida. Iltimos, to‘rtta sinfingizning oraliq natijalarini olib keling.\n\nOlivia'
    ),
    minutesAgo(50), true, 'inbox', ['teacher']
  ),
  M(
    't2', 'Sarah Morgan', 'Parent',
    L('Question about Friday’s quiz', 'Вопрос о тесте в пятницу', 'Juma kungi test haqida savol'),
    L(
      'Hello Mr. Hayes,\n\nAlex will be at the dentist on Thursday afternoon. Is there anything he should prepare for Friday’s quiz?\n\nSarah Morgan',
      'Здравствуйте, Mr. Hayes!\n\nВ четверг днём Alex будет у стоматолога. Что ему нужно подготовить к тесту в пятницу?\n\nSarah Morgan',
      'Assalomu alaykum, Mr. Hayes!\n\nPayshanba kuni tushdan keyin Alex tish shifokorida bo‘ladi. Juma kungi testga nimalarni tayyorlashi kerak?\n\nSarah Morgan'
    ),
    minutesAgo(60 * 5), true, 'inbox', ['teacher']
  ),
  M(
    't3', 'Mia Carter', 'Student',
    L('Extension request', 'Просьба продлить срок', 'Muddatni uzaytirish iltimosi'),
    L(
      'Dear Mr. Hayes,\n\nI was ill on Monday and missed the lesson on completing the square. Could I hand in problem set 4 on Monday instead?\n\nMia',
      'Здравствуйте, Mr. Hayes!\n\nВ понедельник я болела и пропустила урок про выделение полного квадрата. Можно сдать задачи 4 в понедельник?\n\nMia',
      'Assalomu alaykum, Mr. Hayes!\n\nDushanba kuni kasal bo‘lib, to‘liq kvadrat ajratish darsini qoldirdim. 4-masalalarni dushanba kuni topshirsam bo‘ladimi?\n\nMia'
    ),
    minutesAgo(60 * 28), false, 'inbox', ['teacher']
  ),
  // ---- admin inbox
  M(
    'a1', 'Mr. Daniel Hayes', 'Teacher',
    L('Projector in B204', 'Проектор в B204', 'B204 dagi proyektor'),
    L(
      'Hi Olivia,\n\nThe projector in B204 stopped working this morning. Could facilities take a look before Monday’s first lesson?\n\nDaniel',
      'Привет, Olivia!\n\nУтром в B204 перестал работать проектор. Может ли хозяйственная служба посмотреть его до первого урока в понедельник?\n\nDaniel',
      'Salom, Olivia!\n\nBugun ertalab B204 dagi proyektor ishlamay qoldi. Xo‘jalik xizmati dushanbadagi birinchi darsgacha ko‘rib chiqa oladimi?\n\nDaniel'
    ),
    minutesAgo(40), true, 'inbox', ['school']
  ),
  M(
    'a2', 'Admissions', 'School',
    L('3 new enrolment requests', '3 новые заявки на зачисление', '3 ta yangi qabul arizasi'),
    L(
      'Three families have applied for Year 7 this week. Their documents are complete; the students can be added to 7-B and 7-D, where there are free places.',
      'На этой неделе три семьи подали заявки в 7 класс. Документы полные; учеников можно добавить в 7-B и 7-D — там есть свободные места.',
      'Bu hafta uchta oila 7-sinfga ariza topshirdi. Hujjatlar to‘liq; o‘quvchilarni bo‘sh o‘rinlar bor 7-B va 7-D sinflariga qo‘shish mumkin.'
    ),
    minutesAgo(60 * 3), true, 'inbox', ['school']
  ),
  M(
    'a3', 'Sarah Morgan', 'Parent',
    L('Conference booking', 'Запись на собрание', 'Majlisga yozilish'),
    L(
      'Hello,\n\nIs it possible to book two conference slots back to back for my children in 6-C and 9-A?\n\nSarah Morgan',
      'Здравствуйте!\n\nМожно ли записаться на два собрания подряд — для моих детей из 6-C и 9-A?\n\nSarah Morgan',
      'Assalomu alaykum!\n\n6-C va 9-A dagi farzandlarim uchun ketma-ket ikkita majlis vaqtiga yozilish mumkinmi?\n\nSarah Morgan'
    ),
    minutesAgo(60 * 27), false, 'inbox', ['school']
  ),
];

// ---------- notifications ----------
const N = (id, type, title, text, mins, unread, audience = ['student']) => ({ id, type, title, text, at: minutesAgo(mins), unread, audience });
export const NOTIFICATIONS = [
  N('n1', 'assignment', L('New assignment', 'Новое задание', 'Yangi vazifa'), L('Mr. Hayes posted “Quadratic equations — problem set 4”, due tomorrow.', 'Mr. Hayes выдал «Квадратные уравнения — задачи 4», срок — завтра.', 'Mr. Hayes “Kvadrat tenglamalar — 4-masalalar” vazifasini berdi, muddati ertaga.'), 25, true),
  N('n2', 'grade', L('Grade updated', 'Оценка обновлена', 'Baho yangilandi'), L('Linear functions — problem set 3 was graded: 5.', 'За «Линейные функции — задачи 3» выставлена оценка 5.', '“Chiziqli funksiyalar — 3-masalalar” uchun 5 baho qo‘yildi.'), 120, true),
  N('n3', 'schedule', L('Schedule changed', 'Изменение в расписании', 'Jadvalda o‘zgarish'), L('Thursday’s Chemistry moves from Lab 1 to Lab 4.', 'Химия в четверг переносится из Лаб. 1 в Лаб. 4.', 'Payshanbadagi kimyo darsi Lab. 1 dan Lab. 4 ga ko‘chirildi.'), 240, true),
  N('n4', 'announcement', L('Important school announcement', 'Важное объявление школы', 'Maktabning muhim e’loni'), L('Parent–teacher conference booking is open until October 9.', 'Запись на родительские собрания открыта до 9 октября.', 'Ota-onalar majlisiga yozilish 9-oktabrgacha ochiq.'), 60 * 26, false, ['student', 'parent', 'teacher', 'school']),
  N('n5', 'message', L('New message', 'Новое сообщение', 'Yangi xabar'), L('Ms. Laurent sent feedback on your essay.', 'Ms. Laurent прислала отзыв на ваше эссе.', 'Ms. Laurent inshongiz bo‘yicha fikr yubordi.'), 60 * 28, false),
  N('n6', 'attendance', L('Attendance recorded', 'Отмечена посещаемость', 'Davomat belgilandi'), L('You were marked late for Physics on Tuesday (arrived 08:41).', 'Во вторник вы опоздали на физику (пришли в 08:41).', 'Seshanba kuni fizika darsiga kechikdingiz (08:41 da keldingiz).'), 60 * 50, false),
  N('n7', 'assignment', L('Deadline approaching', 'Приближается срок', 'Muddat yaqinlashmoqda'), L('Essay: symbolism in “Lord of the Flies” is due in 3 days.', 'Эссе «Символизм в „Повелителе мух“» нужно сдать через 3 дня.', '“Pashshalar hukmdori”dagi ramzlar haqidagi inshoni 3 kundan keyin topshirish kerak.'), 60 * 52, false),
  // parent
  N('pn1', 'grade', L('New grade for Alex', 'Новая оценка у Alex', 'Alex uchun yangi baho'), L('Mathematics · Linear functions — problem set 3: 5.', 'Математика · Линейные функции — задачи 3: 5.', 'Matematika · Chiziqli funksiyalar — 3-masalalar: 5.'), 120, true, ['parent']),
  N('pn2', 'assignment', L('Overdue work', 'Просроченное задание', 'Muddati o‘tgan vazifa'), L('Alex has 2 overdue assignments: History and French.', 'У Alex 2 просроченных задания: история и французский.', 'Alexning 2 ta vazifasi muddati o‘tgan: tarix va fransuz tili.'), 180, true, ['parent']),
  N('pn3', 'attendance', L('Late arrival', 'Опоздание', 'Kechikish'), L('Alex arrived at 08:41 for Physics on Tuesday.', 'Во вторник Alex пришёл на физику в 08:41.', 'Seshanba kuni Alex fizika darsiga 08:41 da keldi.'), 60 * 50, false, ['parent']),
  N('pn4', 'message', L('New message', 'Новое сообщение', 'Yangi xabar'), L('Ms. Silva wrote about Emma’s reading.', 'Ms. Silva написала о чтении Эммы.', 'Ms. Silva Emmaning o‘qishi haqida yozdi.'), 90, true, ['parent']),
  // teacher
  N('tn1', 'assignment', L('New submissions', 'Новые сданные работы', 'Yangi topshirilgan ishlar'), L('19 of 27 students in 9-A handed in problem set 4.', '19 из 27 учеников 9-A сдали задачи 4.', '9-A dagi 27 o‘quvchidan 19 nafari 4-masalalarni topshirdi.'), 30, true, ['teacher']),
  N('tn2', 'schedule', L('Room change', 'Смена кабинета', 'Xona o‘zgarishi'), L('Tuesday 09:25 · 10-B moves from B206 to B204.', 'Вторник 09:25 · 10-B переходит из B206 в B204.', 'Seshanba 09:25 · 10-B B206 dan B204 ga ko‘chadi.'), 200, true, ['teacher']),
  N('tn3', 'message', L('New message', 'Новое сообщение', 'Yangi xabar'), L('Olivia Chen: department meeting on Thursday.', 'Olivia Chen: собрание кафедры в четверг.', 'Olivia Chen: payshanba kuni kafedra yig‘ilishi.'), 50, false, ['teacher']),
  // admin
  N('sn1', 'announcement', L('Enrolment requests', 'Заявки на зачисление', 'Qabul arizalari'), L('3 new requests for Year 7 are waiting for review.', '3 новые заявки в 7 класс ждут рассмотрения.', '7-sinfga 3 ta yangi ariza ko‘rib chiqilishini kutmoqda.'), 180, true, ['school']),
  N('sn2', 'attendance', L('Attendance below target', 'Посещаемость ниже цели', 'Davomat maqsaddan past'), L('Year 11 attendance this week: 92.1% (target 95%).', 'Посещаемость 11 классов на этой неделе: 92,1% (цель 95%).', '11-sinflar davomati bu hafta: 92,1% (maqsad 95%).'), 300, true, ['school']),
  N('sn3', 'grade', L('Grades published', 'Оценки выставлены', 'Baholar e’lon qilindi'), L('Ms. Laurent published Essay 1 grades for 9-A.', 'Ms. Laurent выставила оценки за эссе 1 в 9-A.', 'Ms. Laurent 9-A uchun Insho 1 baholarini e’lon qildi.'), 12, false, ['school']),
];
