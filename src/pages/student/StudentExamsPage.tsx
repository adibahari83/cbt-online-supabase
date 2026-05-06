import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Exam } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Key, Loader2, Play, Calendar, BookMarked } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentExamsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<(Exam & { has_attempt?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [token, setToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      const [examsRes, attemptsRes] = await Promise.all([
        supabase.from('exams').select('*, subject:subjects(*), class:classes(*)').eq('is_active', true),
        supabase.from('student_exams').select('exam_id, status').eq('student_id', profile?.id || ''),
      ]);
      const attempts = new Map((attemptsRes.data || []).map(a => [a.exam_id, a.status]));
      setExams((examsRes.data || []).map(e => ({ ...e, has_attempt: attempts.has(e.id) })));
      setLoading(false);
    };
    if (profile) fetchExams();
  }, [profile]);

  const handleTokenSubmit = async () => {
    if (!token.trim()) { toast.error('Masukkan token ujian'); return; }
    setTokenLoading(true);
    const { data: exam } = await supabase.from('exams').select('*').eq('token', token.toUpperCase()).eq('is_active', true).maybeSingle();
    if (!exam) { toast.error('Token tidak valid atau ujian tidak aktif'); setTokenLoading(false); return; }

    const { data: existing } = await supabase.from('student_exams')
      .select('*').eq('exam_id', exam.id).eq('student_id', profile!.id).maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ex = existing as any;
      if (ex.status === 'in_progress') {
        navigate(`/exam/${exam.id}`);
      } else if (ex.status === 'submitted' || ex.status === 'timed_out') {
        toast.error('Anda sudah menyelesaikan ujian ini');
      }
    } else {
      navigate(`/exam/${exam.id}`);
    }
    setTokenLoading(false);
    setTokenDialogOpen(false);
  };

  const handleStartExam = async (exam: Exam) => {
    const { data: existing } = await supabase.from('student_exams')
      .select('*').eq('exam_id', exam.id).eq('student_id', profile!.id).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (existing && ((existing as any).status === 'submitted' || (existing as any).status === 'timed_out')) {
      toast.error('Anda sudah menyelesaikan ujian ini');
      return;
    }
    navigate(`/exam/${exam.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Ujian Tersedia</h2>
          <p className="text-sm text-slate-500">Pilih ujian atau masukkan token untuk memulai</p>
        </div>
        <Button onClick={() => setTokenDialogOpen(true)} className="bg-blue-600 hover:bg-blue-500">
          <Key className="w-4 h-4 mr-2" />Masukkan Token
        </Button>
      </div>

      {exams.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-500 font-medium">Tidak ada ujian aktif saat ini</h3>
          <p className="text-slate-400 text-sm mt-1">Hubungi guru Anda untuk informasi jadwal ujian</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map(exam => (
            <Card key={exam.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className={exam.has_attempt ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}>
                    {exam.has_attempt ? 'Sudah Dikerjakan' : 'Tersedia'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{exam.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{exam.description || 'Tidak ada deskripsi'}</p>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" /><span>{exam.duration_minutes} menit</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <BookMarked className="w-3.5 h-3.5" /><span>{(exam as Exam & { subject?: { name: string } }).subject?.name || 'Umum'}</span>
                  </div>
                  {exam.start_time && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(exam.start_time).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleStartExam(exam)}
                  disabled={exam.has_attempt}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {exam.has_attempt ? 'Sudah Selesai' : 'Mulai Ujian'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Masukkan Token Ujian</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Masukkan token/kode akses yang diberikan oleh guru Anda.</p>
            <div className="space-y-2">
              <Label>Token Ujian</Label>
              <Input
                value={token}
                onChange={e => setToken(e.target.value.toUpperCase())}
                placeholder="Contoh: ABC123"
                className="font-mono text-center text-lg tracking-widest uppercase"
                maxLength={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenDialogOpen(false)}>Batal</Button>
            <Button onClick={handleTokenSubmit} disabled={tokenLoading} className="bg-blue-600 hover:bg-blue-500">
              {tokenLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Masuk Ujian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
