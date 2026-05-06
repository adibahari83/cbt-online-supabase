import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { BookOpen, LayoutDashboard, Users, BookMarked, FileText, BarChart3, Settings, GraduationCap, ClipboardList, Eye, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const adminNavItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Manajemen Pengguna', icon: Users },
  { href: '/admin/classes', label: 'Manajemen Kelas', icon: GraduationCap },
  { href: '/admin/subjects', label: 'Mata Pelajaran', icon: BookMarked },
  { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
];

const teacherNavItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/teacher/questions', label: 'Bank Soal', icon: BookMarked },
  { href: '/teacher/exams', label: 'Manajemen Ujian', icon: FileText },
  { href: '/teacher/monitoring', label: 'Monitoring Langsung', icon: Eye },
  { href: '/teacher/grades', label: 'Nilai & Analitik', icon: BarChart3 },
];

const studentNavItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/student/exams', label: 'Daftar Ujian', icon: ClipboardList },
  { href: '/student/results', label: 'Riwayat Hasil', icon: BarChart3 },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = profile?.role === 'admin' ? adminNavItems : profile?.role === 'teacher' ? teacherNavItems : studentNavItems;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'teacher' ? 'Guru' : 'Siswa';
  const roleColor = profile?.role === 'admin' ? 'bg-red-500/20 text-red-400' : profile?.role === 'teacher' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-700/50 z-40 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">CBT Online</p>
              <p className="text-slate-400 text-xs">Ujian Digital</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{profile?.full_name?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{profile?.full_name || 'Pengguna'}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleColor)}>{roleLabel}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Keluar
          </Button>
        </div>
      </aside>
    </>
  );
}
