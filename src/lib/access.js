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
  staff: ['school'],
  gradebook: ['teacher', 'school'],
  attendance: ['student', 'parent', 'teacher', 'school'],
  analytics: ['teacher', 'school'],
  assignments: ['student', 'parent', 'teacher', 'school'],
  grades: ['student', 'parent'],
  'report-card': ['student', 'parent'],
  schedule: ['student', 'parent', 'teacher', 'school'],
  progress: ['student', 'parent'],
  announcements: ['student', 'parent', 'teacher', 'school'],
  messages: ['student', 'parent', 'teacher', 'school'],
  notifications: ['student', 'parent', 'teacher', 'school'],
  settings: ['student', 'parent', 'teacher', 'school'],
  meetings: ['parent', 'teacher', 'school'],
  behavior: ['student', 'parent', 'teacher', 'school'],
  owner: [],
};

// The hidden Owner role opens every page.
export const canAccess = (role, page) => (role === 'owner' ? page in ACCESS : !!ACCESS[page]?.includes(role));
export const homeFor = (role) => `/app/${role}`;
/** For the Owner: which role's view a page belongs to (the first role that can open it). */
export const viewRoleFor = (page, current) => (ACCESS[page]?.includes(current) ? current : ACCESS[page]?.[0] || current);
