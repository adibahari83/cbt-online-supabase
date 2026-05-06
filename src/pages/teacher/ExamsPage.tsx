import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Exam, Subject, Class, Question } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Loader2, FileText, Copy, BookMarked, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function generateToken(length = 6) {
  return Math.random().toString(36).substring(2, length + 2).toUpperCase();
}

export default function ExamsPage() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', subject_id: '', class_id: '', token: generateToken(),
    duration_minutes: 60, start_time: '', end_time: '', is_active: false,
    shuffle_questions: false, shuffle_options: false, show_result_immediately: true,
    passing_score: 60, max_attempts: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    const [examsRes, subjectsRes, classesRes, questionsRes] = await Promise.all([
      supabase.from('exams').select('*, subject:subjects(*), class:classes(*)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('classes').select('*').order('name'),
      supabase.from('questions').select('*, subject:subjects(*)').order('created_at', { ascending: false }),
    ]);
    setExams(examsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setClasses(classesRes.data || []);
    setQuestions(questionsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = exams.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingExam(null);
    setForm({ title: '', description: '', subject_id: '', class_id: '', token: generateToken(), duration_minutes: 60, start_time: '', end_time: '', is_active: false, shuffle_questions: false, shuffle_options: false, show_result_immediately: true, passing_score: 60, max_attempts: 1 });
    setDialogOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingExam(exam);
    setForm({
      title: exam.title, description: exam.description, subject_id: exam.subject_id || '',
      class_id: exam.class_id || '', token: exam.token,
      duration_minutes: exam.duration_minutes,
      start_time: exam.start_time ? exam.start_time.slice(0, 16) : '',
      end_time: exam.end_time ? exam.end_time.slice(0, 16) : '',
      is_active: exam.is_active, shuffle_questions: exam.shuffle_questions, shuffle_options: exam.shuffle_options,
      show_result_immediately: exam.show_result_immediately, passing_score: exam.passing_score, max_attempts: exam.max_attempts,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Judul ujian wajib diisi'); return; }
    setSaving(true);
    const payload = {
      title: form.title, description: form.description, subject_id: form.subject_id || null,
      class_id: form.class_id || null, teacher_id: profile?.id, token: form.token,
      duration_minutes: form.duration_minutes, start_time: form.start_time || null, end_time: form.end_time || null,
      is_active: form.is_active, shuffle_questions: form.shuffle_questions, shuffle_options: form.shuffle_options,
      show_result_immediately: form.show_result_immediately, passing_score: form.passing_score, max_attempts: form.max_attempts,
    };
    const { error } = editingExam
      ? await supabase.from('exams').update(payload).eq('id', editingExam.id)
      : await supabase.from('exams').insert(payload);
    setSaving(false);
    if (error) toast.error('Gagal menyimpan ujian');
    else { toast.success(editingExam ? 'Ujian diperbarui' : 'Ujian dibuat'); setDialogOpen(false); fetchData(); }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Hapus ujian "${exam.title}"?`)) return;
    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
    if (error) toast.error('Gagal menghapus ujian');
    else { toast.success('Ujian dihapus'); fetchData(); }
  };

  const openQuestionsDialog = async (examId: string) => {
    setCurrentExamId(examId);
    const { data } = await supabase.from('exam_questions').select('question_id').eq('exam_id', examId);
    setSelectedQuestions(new Set((data || []).map(eq => eq.question_id)));
    setQuestionsDialogOpen(true);
  };

  const handleSaveQuestions = async () => {
    if (!currentExamId) return;
    setSaving(true);
    await supabase.from('exam_questions').delete().eq('exam_id', currentExamId);
    const inserts = Array.from(selectedQuestions).map((qId, i) => ({ exam_id: currentExamId, question_id: qId, question_order: i }));
    if (inserts.length > 0) await supabase.from('exam_questions').insert(inserts);
    setSaving(false);
    toast.success(`${inserts.length} soal disimpan ke ujian`);
    setQuestionsDialogOpen(false);
    fetchData();
  };

  const copyToken = (token: string) => { navigator.clipboard.writeText(token); toast.success('Token disalin!'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Cari ujian..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500"><Plus className="w-4 h-4 mr-2" />Buat Ujian</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />Daftar Ujian ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul Ujian</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(exam => (
                  <TableRow key={exam.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-700">{exam.title}</p>
                        <p className="text-xs text-slate-400">{(exam as Exam & { subject?: Subject }).subject?.name || 'Umum'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{exam.token}</span>
                        <button onClick={() => copyToken(exam.token)} className="text-slate-400 hover:text-blue-600"><Copy className="w-3 h-3" /></button>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{(exam as Exam & { class?: Class }).class?.name || '-'}</TableCell>
                    <TableCell className="text-slate-500">{exam.duration_minutes} menit</TableCell>
                    <TableCell>
                      <Badge variant={exam.is_active ? 'default' : 'secondary'} className={exam.is_active ? 'bg-emerald-100 text-emerald-700' : ''}>
                        {exam.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openQuestionsDialog(exam.id)} className="text-xs text-blue-600">
                          <BookMarked className="w-3.5 h-3.5 mr-1" />Soal
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(exam)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exam)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-10">Tidak ada ujian ditemukan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExam ? 'Edit Ujian' : 'Buat Ujian Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Judul Ujian *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ujian Tengah Semester Matematika" /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan ujian..." rows={2} className="resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <Select value={form.subject_id || 'none'} onValueChange={v => setForm({ ...form, subject_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Umum -</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={form.class_id || 'none'} onValueChange={v => setForm({ ...form, class_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Semua Kelas -</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Token / Kode Akses</Label>
                <div className="flex gap-2">
                  <Input value={form.token} onChange={e => setForm({ ...form, token: e.target.value.toUpperCase() })} className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, token: generateToken() })}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Durasi (menit)</Label>
                <Input type="number" min={5} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Waktu Selesai</Label>
                <Input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>KKM / Nilai Lulus</Label>
                <Input type="number" min={0} max={100} value={form.passing_score} onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 60 })} />
              </div>
              <div className="space-y-2">
                <Label>Maks. Percobaan</Label>
                <Input type="number" min={1} value={form.max_attempts} onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label className="text-sm font-medium">Pengaturan Ujian</Label>
              {[
                { key: 'is_active', label: 'Aktifkan Ujian' },
                { key: 'shuffle_questions', label: 'Acak Urutan Soal' },
                { key: 'shuffle_options', label: 'Acak Pilihan Jawaban' },
                { key: 'show_result_immediately', label: 'Tampilkan Hasil Langsung' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal text-slate-600">{label}</Label>
                  <Switch checked={form[key as keyof typeof form] as boolean} onCheckedChange={v => setForm({ ...form, [key]: v })} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingExam ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Pilih Soal untuk Ujian ({selectedQuestions.size} dipilih)</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {questions.map((q, i) => (
              <div key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedQuestions.has(q.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                onClick={() => {
                  const newSet = new Set(selectedQuestions);
                  if (newSet.has(q.id)) newSet.delete(q.id); else newSet.add(q.id);
                  setSelectedQuestions(newSet);
                }}>
                <Checkbox checked={selectedQuestions.has(q.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2">{i + 1}. {q.question_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{(q as Question & { subject?: Subject }).subject?.name || 'Umum'}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">{q.question_type === 'multiple_choice' ? 'Pilihan Ganda' : q.question_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveQuestions} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Simpan ({selectedQuestions.size} soal)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
