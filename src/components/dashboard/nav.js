import { FiHome, FiCalendar, FiCheckSquare, FiAward, FiTrendingUp, FiMessageSquare, FiBell, FiSettings, FiUsers, FiBarChart2 } from 'react-icons/fi';

const ICONS = {
  overview: FiHome,
  schedule: FiCalendar,
  assignments: FiCheckSquare,
  grades: FiAward,
  progress: FiTrendingUp,
  messages: FiMessageSquare,
  notifications: FiBell,
  settings: FiSettings,
  students: FiUsers,
  analytics: FiBarChart2,
};

// Label = t(`nav.${key}`)
const item = (key, to) => ({ key, to, icon: ICONS[key] });
const comms = [item('messages', '/app/messages'), item('notifications', '/app/notifications')];

export const NAV = {
  student: {
    main: [item('overview', '/app/student'), item('schedule', '/app/schedule'), item('assignments', '/app/assignments'), item('grades', '/app/grades'), item('progress', '/app/progress')],
    comms,
  },
  parent: {
    main: [item('overview', '/app/parent'), item('grades', '/app/grades'), item('assignments', '/app/assignments'), item('schedule', '/app/schedule'), item('progress', '/app/progress')],
    comms,
  },
  teacher: {
    main: [item('overview', '/app/teacher'), item('students', '/app/students'), item('assignments', '/app/assignments'), item('grades', '/app/grades'), item('schedule', '/app/schedule'), item('analytics', '/app/analytics')],
    comms,
  },
  school: {
    main: [item('overview', '/app/school'), item('students', '/app/students'), item('analytics', '/app/analytics'), item('assignments', '/app/assignments'), item('grades', '/app/grades'), item('schedule', '/app/schedule')],
    comms,
  },
};

export const SETTINGS_ITEM = item('settings', '/app/settings');

/** Route segment → nav label key */
export const PAGE_KEYS = {
  student: 'overview',
  parent: 'overview',
  teacher: 'overview',
  school: 'overview',
  students: 'students',
  assignments: 'assignments',
  grades: 'grades',
  schedule: 'schedule',
  progress: 'progress',
  analytics: 'analytics',
  messages: 'messages',
  notifications: 'notifications',
  settings: 'settings',
};
