/**
 * Which roles may open which /app page. This single map drives the sidebar,
 * the route guard and the read-only access table in Settings.
 */
export const ROLE_KEYS = ['student', 'parent', 'teacher', 'school'];

export const ACCESS = {
  student: ['student'],
  parent: ['parent'],
  teacher: ['teacher'],
  school: ['school'],
  students: ['teacher', 'school'],
  analytics: ['teacher', 'school'],
  assignments: ['student', 'parent', 'teacher', 'school'],
  grades: ['student', 'parent', 'teacher', 'school'],
  schedule: ['student', 'parent', 'teacher', 'school'],
  progress: ['student', 'parent'],
  messages: ['student', 'parent', 'teacher', 'school'],
  notifications: ['student', 'parent', 'teacher', 'school'],
  settings: ['student', 'parent', 'teacher', 'school'],
};

export const canAccess = (role, page) => !!ACCESS[page]?.includes(role);
export const homeFor = (role) => `/app/${role}`;
