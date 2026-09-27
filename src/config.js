/**
 * App configuration.
 *
 * SHOW_DEMO_ACCOUNTS — lists the four demo logins on the sign-in page so the
 * demo can be explored. Set to false before giving the app to real users.
 */
export const SHOW_DEMO_ACCOUNTS = true;

/** Demo accounts — one per role. Each has its own email and password. */
export const DEMO_ACCOUNTS = [
  { id: 'demo-student', role: 'student', name: 'Alex Morgan', email: 'alex.morgan@northbridge.edu', password: 'Student2026!' },
  { id: 'demo-parent', role: 'parent', name: 'Sarah Morgan', email: 'sarah.morgan@example.com', password: 'Parent2026!' },
  { id: 'demo-teacher', role: 'teacher', name: 'Daniel Hayes', email: 'daniel.hayes@northbridge.edu', password: 'Teacher2026!' },
  { id: 'demo-admin', role: 'school', name: 'Olivia Chen', email: 'olivia.chen@northbridge.edu', password: 'Admin2026!' },
];

export const MIN_PASSWORD = 8;
