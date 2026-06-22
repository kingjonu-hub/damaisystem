import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import KpiInputPage from './pages/KpiInputPage';
import KpiScoresPage from './pages/KpiScoresPage';
import KpiWeightsPage from './pages/KpiWeightsPage';
import ReviewsPage from './pages/ReviewsPage';
import EmployeesPage from './pages/EmployeesPage';
import OrganizationPage from './pages/OrganizationPage';
import PeriodsPage from './pages/PeriodsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/kpi/input" element={<ProtectedRoute roles={['admin', 'manajer_unit', 'dosen_tendik']}><KpiInputPage /></ProtectedRoute>} />
        <Route path="/kpi/scores" element={<KpiScoresPage />} />
        <Route path="/kpi/weights" element={<ProtectedRoute roles={['admin']}><KpiWeightsPage /></ProtectedRoute>} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/employees" element={<ProtectedRoute roles={['yayasan', 'admin', 'pimpinan', 'manajer_unit']}><EmployeesPage /></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute roles={['yayasan', 'admin']}><OrganizationPage /></ProtectedRoute>} />
        <Route path="/periods" element={<ProtectedRoute roles={['admin']}><PeriodsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
