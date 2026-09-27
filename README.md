# EduCore

EdTech platform for students, parents, teachers and school administrators, designed for organisations of up to 5,000 students.
Interface in **English, Russian and Uzbek (Latin)**.

**Stack:** React 18 · Vite 5 · React Router 6 · react-icons · Recharts · plain CSS (own design system, no Tailwind or Bootstrap).

## Run

```bash
npm install
npm run dev           # http://localhost:5173
npm run build         # production build → dist/
npm run build:single  # the whole app as one HTML file → dist-single/index.html
npm run build:docs    # update the GitHub Pages site: builds and copies everything into docs/
npm run lint          # ESLint
npm run check:i18n    # every translation key exists in en / ru / uz
```

## Accounts and roles

Every person has their own login. The role of the account decides which dashboard opens and which pages are available.
The Sidebar, the route guard and the table in *Settings → Roles & access* all use one map: `src/lib/access.js`.

| Role | Email | Password |
|---|---|---|
| Student | alex.morgan@northbridge.edu | Student2026! |
| Parent | sarah.morgan@example.com | Parent2026! |
| Teacher | daniel.hayes@northbridge.edu | Teacher2026! |
| School admin | olivia.chen@northbridge.edu | Admin2026! |

**Hidden Owner account.** Not listed on the sign-in page and not available on sign-up. Opens every page, can view the app
as any of the four roles (switch in the header), and has an *Owner console* (`/app/owner`): all accounts, change role,
reset password, delete, data backup and reset. Email and password are set in `src/config.js` (`OWNER_ACCOUNT`, only a hash
of the password is stored). Change them with `npm run owner-password -- "New-Password" you@example.com`, then `npm run build:docs`.

New accounts can be created on `/register` (student, parent, teacher or school admin).
The demo logins are listed on the sign-in page; turn that off with `SHOW_DEMO_ACCOUNTS = false` in `src/config.js`.

## Two modes: demo and server

- **Demo (default).** `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `src/config.js` are empty: accounts and changes are kept in
  the browser (localStorage / IndexedDB). Good for trying the product, not for real data.
- **Server (Supabase).** Fill in both values: real sign-up / sign-in (email confirmation, password reset by email),
  data shared by all devices, submitted files in Supabase Storage, live updates. Access is enforced in the database with
  Row Level Security (`supabase/setup.sql`): e.g. only teachers write marks and attendance, a student can only hand in their
  own work and can't grade it, only the owner changes roles or blocks accounts. Teacher / admin self-sign-ups wait for the
  owner's approval; accounts the school admin prepared get their role on sign-up.
  Step-by-step setup (in Russian): **[SUPABASE.md](SUPABASE.md)**.

The school roster (4,862 students, 186 classes, 327 teachers) is still the demo data set in both modes; the server stores
accounts and every change made in the app.

## Languages

- Dictionaries: `src/i18n/en.js`, `ru.js`, `uz.js` — same structure in all three.
- Language switcher: landing header and footer, sign-in pages, dashboard header, *Settings → Profile*.
- The choice is remembered; the first visit follows the browser language.
- Numbers and dates follow the language (`4,862` / `4 862`, `27 Sept` / `27 сент.` / `27-sen`). Uzbek dates are formatted by the app itself because some browsers ship incomplete Uzbek locale data.
- Demo data (assignments, messages, notifications) is stored as `{ en, ru, uz }` in `src/data/mock.js`.

## What works in the demo

- Sign in / register / sign out, change password, role-restricted pages (direct links to other roles' pages show "not available").
- **Student:** dashboard, assignments with **file submission** (PDF, Word, text, photos; up to 5 files of 5 MB) and a comment,
  the teacher's grade and feedback, schedule (**.ics download**), grades, **attendance calendar**, **report card** (print / PDF), progress.
- **Parent:** three children with a switcher — grades, attendance calendar, report card for each child; notifications; message to the form tutor.
- **Teacher:** **gradebook** (marks 2–5 per student and column, add / delete columns, averages, CSV), **attendance** by day
  (present / late / absent, history, CSV), grading of submitted work (the grade goes into the gradebook and to the student),
  publish assignments and class announcements.
- **Admin:** school KPIs and charts, 4,862 students (search, filters, sorting, pagination, bulk actions, add / archive,
  **move to another class**, CSV), **staff & classes** (add a teacher with a sign-in account, edit subject and classes,
  deactivate, change form tutors), school-wide attendance and gradebook (view), announcements for everyone, a group or a class.
- **Chat** between people (student / parent ↔ teachers and the school; staff ↔ anyone), live in server mode.
- **Timetable editor** for the school admin with teacher and room clash checks; students, parents and teachers see their own week.
- **Parent–teacher conferences**: teachers open time slots, parents book and cancel.
- **Behaviour**: teachers add praise and remarks; students and parents see them.
- **Term grades**: the gradebook proposes the average rounded half up, the teacher confirms, the grade goes to the report card.
- Announcements, notifications (read / mark all, per-type preferences), light / dark / system theme,
  **install as an app** (Settings → Appearance).

Grades, attendance, submissions, announcements and staff changes are saved in the browser, so they are shared between
the demo accounts on the same device (e.g. grade as the teacher, then sign in as the student to see it).
Submitted files are kept in the browser's IndexedDB.

## Publishing on GitHub Pages

The site is served from the `docs/` folder of the `main` branch (*Settings → Pages → Deploy from a branch → main / docs*).
After any change:

```bash
npm run build:docs
git add .
git commit -m "Update site"
git push
```

`build:docs` also copies icons, `manifest.webmanifest`, `sw.js`, the link-preview image and your photos.

**Own domain.** Put a file named `CNAME` in the project root with one line — your domain (e.g. `school.example.com`),
set `"homepage"` in `package.json` to `https://school.example.com/` (used in link previews), run `npm run build:docs` and push.
At your domain registrar add a `CNAME` record pointing to `ssyyy-sh.github.io`, then enter the domain in *Settings → Pages → Custom domain*
and tick *Enforce HTTPS* once it is available.

**Link previews.** Title, description and `public/og-image.png` (1200×630) are set in `index.html`. Replace the image to change the preview.

**Install as an app.** The site has a web manifest, icons and a service worker (works offline after the first visit).
On Android / desktop Chrome and Edge use *Install*; on iPhone — Safari → Share → *Add to Home Screen*.

**Own photos.** Put files into `public/images/` and list them in `OWN_PHOTOS` in `src/config.js`
(e.g. `campus: 'campus.jpg'`). If a file can't be loaded, the stock photo is shown.

## Structure

```
src/
  config.js               demo accounts, feature flags
  i18n/                   I18nContext + en / ru / uz dictionaries
  context/                AuthContext (accounts, session), AppContext (theme, toasts, shared data)
  lib/                    access map, CSV / ICS download, safe storage, files (IndexedDB), PWA
  components/
    landing/              Navbar, Hero, Trust, ProblemSolution, Features, FeatureCard, Showcase,
                          DashboardPreview, Security, Pricing, FAQ, FinalCTA, Footer
    dashboard/            Sidebar, DashboardHeader, StatsCard, AssignmentCard, Schedule, Grades,
                          Progress, Analytics (charts), Notifications, StudentTable, StudentDrawer
    ui/                   Select, Menu, Popover, SearchInput, Status, Avatar, Bar, Segmented,
                          Pagination, Modal, EmptyState, Skeleton, Switch, Toasts, Photo
    LangSwitch.jsx, Logo.jsx
  pages/                  Home, Login, Register, 4 dashboards, Students, Staff, Gradebook, Attendance,
                          Assignments, Grades, ReportCard, Schedule, Progress, AnalyticsPage,
                          Announcements, Messages, Notifications, Settings, NotFound
  styles/                 tokens.css (light + dark), base.css, ui.css, landing.css, app.css
  data/                   mock.js (demo school: Northbridge Academy), images.js
public/                   icons, manifest, service worker, link-preview image, images/ (your photos)
scripts/check-i18n.mjs    translation consistency check
scripts/build-docs.mjs    builds the site into docs/ for GitHub Pages
supabase/setup.sql        database, access rules and file storage for server mode
docs/                     the published site (generated — don't edit by hand)
```
