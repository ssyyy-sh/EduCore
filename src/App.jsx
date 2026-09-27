import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import ParentDashboard from './pages/ParentDashboard.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import SchoolDashboard from './pages/SchoolDashboard.jsx';
import Students from './pages/Students.jsx';
import Assignments from './pages/Assignments.jsx';
import Grades from './pages/Grades.jsx';
import Schedule from './pages/Schedule.jsx';
import Progress from './pages/Progress.jsx';
import Messages from './pages/Messages.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import NotFound from './pages/NotFound.jsx';
import Gradebook from './pages/Gradebook.jsx';
import Attendance from './pages/Attendance.jsx';
import Staff from './pages/Staff.jsx';
import Announcements from './pages/Announcements.jsx';
import ReportCard from './pages/ReportCard.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { homeFor } from './lib/access.js';
import { Toasts } from './components/ui/index.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Only signed-in users reach /app. */
function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

/** Signed-in users skip the login/register pages. */
function GuestOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={homeFor(user.role)} replace />;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<RoleHome />} />
          <Route path="student" element={<StudentDashboard />} />
          <Route path="parent" element={<ParentDashboard />} />
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="school" element={<SchoolDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="grades" element={<Grades />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="progress" element={<Progress />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="gradebook" element={<Gradebook />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="staff" element={<Staff />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="report-card" element={<ReportCard />} />
          <Route path="*" element={<NotFound inApp />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toasts />
    </>
  );
}
