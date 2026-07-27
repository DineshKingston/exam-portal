import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminDashboard from './pages/AdminDashboard';
import StudentAuth from './pages/StudentAuth';
import ExamProctor from './pages/ExamProctor';
import { Shield, Lock } from 'lucide-react';

export default function App() {
  // Routes: 'admin' | 'student-auth' | 'exam-proctor'
  const [route, setRoute] = useState('student-auth');
  const [routeParams, setRouteParams] = useState({});
  const [activeExamConfig, setActiveExamConfig] = useState(null);

  // Admin Session State (Default: locked, default password: "admin")
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('proctorai_admin_unlocked') === 'true';
  });

  // Parse hash routing & query params on mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const [path, queryStr] = hash.split('?');
      const params = {};

      if (queryStr) {
        new URLSearchParams(queryStr).forEach((val, key) => {
          params[key] = val;
        });
      }

      if (path === 'admin') {
        setRoute('admin');
        setRouteParams(params);
      } else {
        // Default route for shared links & students is student authentication!
        setRoute('student-auth');
        setRouteParams(params);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newRoute, params = {}) => {
    setRoute(newRoute);
    setRouteParams(params);
    const queryString = new URLSearchParams(params).toString();
    window.location.hash = queryString ? `${newRoute}?${queryString}` : newRoute;
  };

  const handleUnlockAdmin = () => {
    setIsAdminUnlocked(true);
    sessionStorage.setItem('proctorai_admin_unlocked', 'true');
  };

  const handleLogoutAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('proctorai_admin_unlocked');
    navigateTo('student-auth');
  };

  const handleStartExam = (examConfig) => {
    setActiveExamConfig(examConfig);
    setRoute('exam-proctor');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* Hide Navbar during active exam lockdown to maximize focus */}
      {route !== 'exam-proctor' && (
        <Navbar 
          currentRoute={route} 
          onNavigate={navigateTo} 
          isAdminUnlocked={isAdminUnlocked}
          onAdminLogout={handleLogoutAdmin}
        />
      )}

      <main className="flex-1">
        {route === 'admin' && (
          <AdminDashboard
            onNavigate={navigateTo}
            initialTab={routeParams.tab || 'exams'}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={handleUnlockAdmin}
          />
        )}

        {route === 'student-auth' && (
          <StudentAuth
            onStartExam={handleStartExam}
            initialExamId={routeParams.examId}
          />
        )}

        {route === 'exam-proctor' && activeExamConfig && (
          <ExamProctor
            examConfig={activeExamConfig}
            onFinish={() => {
              if (isAdminUnlocked) navigateTo('admin');
              else navigateTo('student-auth');
            }}
          />
        )}
      </main>

      {/* Discrete Instructor Access Footer (Only shown when not taking test) */}
      {route !== 'exam-proctor' && (
        <footer className="py-6 text-center border-t border-slate-900 bg-slate-950 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© 2026 ProctorAI Platform • Secure AI Examination System</span>
            
            <button
              onClick={() => navigateTo('admin')}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-indigo-400 transition-colors"
              title="Instructor Admin Dashboard Access"
            >
              <Lock className="w-3 h-3" />
              <span>Instructor Portal</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
