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

New accounts can be created on `/register` (student, parent, teacher or school admin).
The demo logins are listed on the sign-in page; turn that off with `SHOW_DEMO_ACCOUNTS = false` in `src/config.js`.

> **Important for production.** In this build, accounts, sessions and data changes are stored in the browser (localStorage) —
> enough for a demo, but not real security: anyone with access to that browser can read or change them.
> Before real students' data is used, move sign-in, passwords and role checks to a server (API + database) and keep the
> same role map on the server side.

## Languages

- Dictionaries: `src/i18n/en.js`, `ru.js`, `uz.js` — same structure in all three.
- Language switcher: landing header and footer, sign-in pages, dashboard header, *Settings → Profile*.
- The choice is remembered; the first visit follows the browser language.
- Numbers and dates follow the language (`4,862` / `4 862`, `27 Sept` / `27 сент.` / `27-sen`). Uzbek dates are formatted by the app itself because some browsers ship incomplete Uzbek locale data.
- Demo data (assignments, messages, notifications) is stored as `{ en, ru, uz }` in `src/data/mock.js`.

## What works in the demo

- Sign in / register / sign out, change password, role-restricted pages (direct links to other roles' pages show "not available").
- Student: dashboard, assignments (mark as submitted), schedule (week/day, **.ics download**), grades (**CSV export**), progress.
- Parent: three children with a switcher, notifications, pre-filled message to the form tutor.
- Teacher: classes, roster with attendance that is saved for the day, publish assignments.
- Admin: school KPIs and charts with a period filter, 4,862 students with search, 5 filters, sorting, pagination, bulk actions,
  add / archive students, **CSV export**, import template.
- Messages (inbox, sent, unread, compose, reply), notifications (read / mark all, per-type preferences), light / dark / system theme.

## Structure

```
src/
  config.js               demo accounts, feature flags
  i18n/                   I18nContext + en / ru / uz dictionaries
  context/                AuthContext (accounts, session), AppContext (theme, toasts, shared data)
  lib/                    access map, CSV / ICS download, safe storage
  components/
    landing/              Navbar, Hero, Trust, ProblemSolution, Features, FeatureCard, Showcase,
                          DashboardPreview, Security, Pricing, FAQ, FinalCTA, Footer
    dashboard/            Sidebar, DashboardHeader, StatsCard, AssignmentCard, Schedule, Grades,
                          Progress, Analytics (charts), Notifications, StudentTable, StudentDrawer
    ui/                   Select, Menu, Popover, SearchInput, Status, Avatar, Bar, Segmented,
                          Pagination, Modal, EmptyState, Skeleton, Switch, Toasts, Photo
    LangSwitch.jsx, Logo.jsx
  pages/                  Home, Login, Register, 4 dashboards, Students, Assignments, Grades,
                          Schedule, Progress, AnalyticsPage, Messages, Notifications, Settings, NotFound
  styles/                 tokens.css (light + dark), base.css, ui.css, landing.css, app.css
  data/                   mock.js (demo school: Northbridge Academy), images.js
scripts/check-i18n.mjs    translation consistency check
```

Photos load from Unsplash — replace `src/data/images.js` with your school's own images.
