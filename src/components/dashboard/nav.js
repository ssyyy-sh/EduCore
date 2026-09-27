import { FiHome, FiCalendar, FiCheckSquare, FiAward, FiTrendingUp, FiMessageSquare, FiBell, FiSettings, FiUsers, FiBarChart2, FiBookOpen, FiUserCheck, FiBriefcase, FiVolume2 } from 'react-icons/fi';

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
  gradebook: FiBookOpen,
  attendance: FiUserCheck,
  staff: FiBriefcase,
  announcements: FiVolume2,
};

// Label = t(`nav.${key}`)
const item = (key, to) => ({ key, to, icon: ICONS[key] });
const comms = [item('announcements', '/app/announcements'), item('messages', '/app/messages'), item('notifications', '/app/notifications')];

export const NAV = {
  student: {
    main: [item('overview', '/app/student'), item('schedule', '/app/schedule'), item('assignments', '/app/assignments'), item('grades', '/app/grades'), item('attendance', '/app/attendance'), item('progress', '/app/progress')],
    comms,
  },
  parent: {
    main: [item('overview', '/app/parent'), item('grades', '/app/grades'), item('assignments', '/app/assignments'), item('attendance', '/app/attendance'), item('schedule', '/app/schedule'), item('progress', '/app/progress')],
    comms,
  },
  teacher: {
    main: [item('overview', '/app/teacher'), item('gradebook', '/app/gradebook'), item('attendance', '/app/attendance'), item('assignments', '/app/assignments'), item('students', '/app/students'), item('schedule', '/app/schedule'), item('analytics', '/app/analytics')],
    comms,
  },
  school: {
    main: [item('overview', '/app/school'), item('students', '/app/students'), item('staff', '/app/staff'), item('attendance', '/app/attendance'), item('gradebook', '/app/gradebook'), item('analytics', '/app/analytics'), item('assignments', '/app/assignments'), item('schedule', '/app/schedule')],
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
  gradebook: 'gradebook',
  attendance: 'attendance',
  staff: 'staff',
  announcements: 'announcements',
  'report-card': 'grades',
};
