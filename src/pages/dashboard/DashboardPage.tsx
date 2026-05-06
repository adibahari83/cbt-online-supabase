import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, FileText, BookMarked, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  activeExams: number;
  totalQuestions: number;
}

const mockChartData = [
  { name: 'Sen', nilai: 75 }, { name: 'Sel', nilai: 82 }, { name: 'Rab', nilai: 68 },
  { name: 'Kam', nilai: 90 }, { name: 'Jum', nilai: 85 }, { name: 'Sab', nilai: 78 },
];

const mockScoreData = [
  { month: 'Jan', skor: 72 }, { month: 'Feb', skor: 78 }, { month: 'Mar', skor: 75 },
  { month: 'Apr', skor: 82 }, { month: 'Mei', skor: 88 }, { month: 'Jun', skor: 85 },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, teachersRes, examsRes, questionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('exams').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('questions').select('id', { count: 'exact' }),
      ]);
      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        activeExams: examsRes.count || 0,
        totalQuestions: questionsRes.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const adminCards = [
    { title: 'Total Siswa', value: stats?.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Siswa terdaftar' },
    { title: 'Total Guru', value: stats?.totalTeachers, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Guru aktif' },
    { title: 'Ujian Aktif', value: stats?.activeExams, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Sedang berlangsung' },
    { title: 'Bank Soal', value: stats?.totalQuestions, icon: BookMarked, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Total soal tersedia' },
  ];

  const teacherCards = [
    { title: 'Bank Soal', value: stats?.totalQuestions, icon: BookMarked, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Soal dibuat' },
    { title: 'Ujian Aktif', value: stats?.activeExams, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Sedang berlangsung' },
    { title: 'Total Siswa', value: stats?.totalStudents, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Siswa diampu' },
    { title: 'Rata-rata Nilai', value: '78.5', icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Semua ujian' },
  ];

  const studentCards = [
    { title: 'Ujian Tersedia', value: stats?.activeExams, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Dapat diikuti' },
    { title: 'Ujian Selesai', value: '5', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Total selesai' },
    { title: 'Rata-rata Nilai', value: '82', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Semua mata pelajaran' },
    { title: 'Ujian Mendatang', value: '2', icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Segera dimulai' },
  ];

  const cards = profile?.role === 'admin' ? adminCards : profile?.role === 'teacher' ? teacherCards : studentCards;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Selamat datang, {profile?.full_name || 'Pengguna'}!
        </h2>
        <p className="text-slate-500 mt-1">
          {profile?.role === 'admin' ? 'Panel Administrasi Sistem CBT' : profile?.role === 'teacher' ? 'Panel Guru - Kelola Ujian dan Soal' : 'Panel Siswa - Lihat Ujian dan Hasil Anda'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">{card.title}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-800 mt-1">{card.value ?? 0}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(profile?.role === 'admin' || profile?.role === 'teacher') && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Aktivitas Ujian Mingguan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="nilai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">
              {profile?.role === 'student' ? 'Perkembangan Nilai Saya' : 'Tren Rata-rata Nilai'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mockScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="skor" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {profile?.role === 'student' && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Ujian Mendatang</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Matematika UTS', time: 'Besok, 09:00', status: 'Segera' },
                  { name: 'Bahasa Indonesia', time: 'Jumat, 10:00', status: 'Mendatang' },
                  { name: 'Fisika', time: 'Senin depan', status: 'Mendatang' },
                ].map((exam, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{exam.name}</p>
                        <p className="text-xs text-slate-400">{exam.time}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${exam.status === 'Segera' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {exam.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {(profile?.role === 'admin') && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Aktivitas Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { text: 'Siswa baru mendaftar: Budi Santoso', type: 'success' },
                  { text: 'Ujian Matematika dibuat oleh Pak Andi', type: 'info' },
                  { text: 'Kelas XII IPA 1 - 28 siswa selesai ujian', type: 'success' },
                  { text: 'Guru baru ditambahkan: Ibu Siti', type: 'info' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    {item.type === 'success'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    }
                    <p className="text-sm text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
