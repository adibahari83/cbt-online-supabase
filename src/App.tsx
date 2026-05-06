import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';

import UsersPage from '@/pages/admin/UsersPage';
import ClassesPage from '@/pages/admin/ClassesPage';
import SubjectsPage from '@/pages/admin/SubjectsPage';
import SettingsPage from '@/pages/admin/SettingsPage';

import QuestionsPage from '@/pages/teacher/QuestionsPage';
import ExamsPage from '@/pages/teacher/ExamsPage';
import MonitoringPage from '@/pages/teacher/MonitoringPage';
import GradesPage from '@/pages/teacher/GradesPage';

import StudentExamsPage from '@/pages/student/StudentExamsPage';
import StudentResultsPage from '@/pages/student/StudentResultsPage';
import ExamPage from '@/pages/exam/ExamPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/exam/:examId" element={
            <ProtectedRoute roles={['student']}>
              <ExamPage />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="admin/users" element={
              <ProtectedRoute roles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="admin/classes" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ClassesPage />
              </ProtectedRoute>
            } />
            <Route path="admin/subjects" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <SubjectsPage />
              </ProtectedRoute>
            } />
            <Route path="admin/settings" element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />

            <Route path="teacher/questions" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <QuestionsPage />
              </ProtectedRoute>
            } />
            <Route path="teacher/exams" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ExamsPage />
              </ProtectedRoute>
            } />
            <Route path="teacher/monitoring" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <MonitoringPage />
              </ProtectedRoute>
            } />
            <Route path="teacher/grades" element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <GradesPage />
              </ProtectedRoute>
            } />

            <Route path="student/exams" element={
              <ProtectedRoute roles={['student']}>
                <StudentExamsPage />
              </ProtectedRoute>
            } />
            <Route path="student/results" element={
              <ProtectedRoute roles={['student']}>
                <StudentResultsPage />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
