import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Beranda',
  '/admin/users': 'Manajemen Pengguna',
  '/admin/classes': 'Manajemen Kelas',
  '/admin/subjects': 'Mata Pelajaran',
  '/admin/settings': 'Pengaturan Sistem',
  '/teacher/questions': 'Bank Soal',
  '/teacher/exams': 'Manajemen Ujian',
  '/teacher/monitoring': 'Monitoring Langsung',
  '/teacher/grades': 'Nilai & Analitik',
  '/student/exams': 'Daftar Ujian',
  '/student/results': 'Riwayat Hasil',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'CBT Online';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
