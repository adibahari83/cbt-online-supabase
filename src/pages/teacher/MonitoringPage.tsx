import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Exam, StudentExam, Profile } from '@/lib/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Users, Clock, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MonitoringPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [sessions, setSessions] = useState<(StudentExam & { student?: Profile; exam?: Exam })[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchExams = async () => {
    const { data } = await supabase.from('exams').select('*').eq('is_active', true).order('created_at', { ascending: false });
    setExams(data || []);
    if (data && data.length > 0 && !selectedExam) setSelectedExam((data[0] as Exam).id);
  };

  const fetchSessions = async () => {
    if (!selectedExam) return;
    setLoading(true);
    const { data } = await supabase.from('student_exams')
      .select('*, student:profiles(*), exam:exams(*)')
      .eq('exam_id', selectedExam)
      .order('created_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => { fetchSessions(); }, [selectedExam]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [selectedExam, autoRefresh]);

  const inProgress = sessions.filter(s => s.status === 'in_progress');
  const submitted = sessions.filter(s => s.status === 'submitted');
  const notStarted = sessions.filter(s => s.status === 'not_started');

  const statusConfig = {
    in_progress: { label: 'Sedang Ujian', color: 'bg-blue-100 text-blue-700', icon: Clock },
    submitted: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    not_started: { label: 'Belum Mulai', color: 'bg-slate-100 text-slate-600', icon: Users },
    timed_out: { label: 'Waktu Habis', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  };

  const formatTime = (secs: number | null) => {
    if (!secs) return '-';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="w-72">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih ujian untuk dimonitor" />
            </SelectTrigger>
            <SelectContent>
              {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className={autoRefresh ? 'bg-emerald-600 hover:bg-emerald-500' : ''}>
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Sedang Ujian', count: inProgress.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Selesai', count: submitted.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Belum Mulai', count: notStarted.length, color: 'text-slate-600', bg: 'bg-slate-50', icon: Users },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" />Status Peserta Ujian</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Tidak ada peserta untuk ujian ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sessions.map(session => {
                const config = statusConfig[session.status];
                const Icon = config.icon;
                const hasCheatWarning = (session.tab_switch_count || 0) > 2;
                return (
                  <div key={session.id} className={`p-4 rounded-xl border-2 ${session.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-slate-600 font-bold text-xs">{session.student?.full_name?.[0]?.toUpperCase() || 'S'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{session.student?.full_name || 'Siswa'}</p>
                          <p className="text-xs text-slate-400">{session.student?.email}</p>
                        </div>
                      </div>
                      {hasCheatWarning && (
                        <div title="Terdeteksi perpindahan tab">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
                        <Icon className="w-3 h-3 inline mr-1" />{config.label}
                      </span>
                      {session.status === 'in_progress' && (
                        <span className="text-xs text-slate-500">
                          Sisa: <strong>{formatTime(session.time_remaining_seconds)}</strong>
                        </span>
                      )}
                      {session.status === 'submitted' && session.submitted_at && (
                        <span className="text-xs text-slate-400">
                          {new Date(session.submitted_at).toLocaleTimeString('id-ID')}
                        </span>
                      )}
                    </div>
                    {hasCheatWarning && (
                      <p className="text-xs text-orange-500 mt-2">Peringatan: {session.tab_switch_count}x perpindahan tab</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
