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

/**
 * Your own photos instead of the stock ones.
 * 1. Put the files into the public/images/ folder.
 * 2. Write the file name next to the place where it should appear, e.g. classroom: 'classroom.jpg'.
 * Places: campus (sign-in page), studentsLaptops (sign-up page), classroom and library (home page,
 * "For schools"), studyHome (home page, "For parents"), studentLaptop (spare).
 * If a file can't be loaded, the stock photo is shown instead.
 */
export const OWN_PHOTOS = {
  // campus: 'campus.jpg',
  // classroom: 'classroom.jpg',
};
