import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Question, Subject, QuestionType } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Loader2, BookMarked, X } from 'lucide-react';
import { toast } from 'sonner';

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  multiple_answer: 'Pilihan Ganda Kompleks',
  true_false: 'Benar/Salah',
  matching: 'Menjodohkan',
  essay: 'Esai',
};

const difficultyLabels: Record<string, string> = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };
const difficultyColors: Record<string, string> = { easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };

export default function QuestionsPage() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    question_text: '', question_type: 'multiple_choice' as QuestionType,
    subject_id: '', difficulty: 'medium', score_weight: 1, explanation: '',
  });
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean; matchPair: string }[]>([
    { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' },
    { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' },
  ]);

  const fetchData = async () => {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      supabase.from('questions').select('*, options:question_options(*), subject:subjects(*)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    setQuestions(qRes.data || []);
    setSubjects(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = questions.filter(q => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || q.question_type === typeFilter;
    return matchSearch && matchType;
  });

  const resetForm = () => {
    setForm({ question_text: '', question_type: 'multiple_choice', subject_id: '', difficulty: 'medium', score_weight: 1, explanation: '' });
    setOptions([{ text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }]);
  };

  const openCreate = () => { setEditingQ(null); resetForm(); setDialogOpen(true); };

  const openEdit = (q: Question) => {
    setEditingQ(q);
    setForm({ question_text: q.question_text, question_type: q.question_type, subject_id: q.subject_id || '', difficulty: q.difficulty, score_weight: q.score_weight, explanation: q.explanation });
    const opts = (q.options || []).map(o => ({ text: o.option_text, isCorrect: o.is_correct, matchPair: o.match_pair }));
    while (opts.length < 4) opts.push({ text: '', isCorrect: false, matchPair: '' });
    setOptions(opts);
    setDialogOpen(true);
  };

  const handleTypeChange = (type: QuestionType) => {
    setForm({ ...form, question_type: type });
    if (type === 'true_false') {
      setOptions([{ text: 'Benar', isCorrect: true, matchPair: '' }, { text: 'Salah', isCorrect: false, matchPair: '' }]);
    } else if (type === 'essay') {
      setOptions([]);
    } else {
      setOptions([{ text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }, { text: '', isCorrect: false, matchPair: '' }]);
    }
  };

  const handleOptionChange = (i: number, field: string, value: string | boolean) => {
    const newOpts = [...options];
    newOpts[i] = { ...newOpts[i], [field]: value };
    if (field === 'isCorrect' && form.question_type === 'multiple_choice' && value === true) {
      newOpts.forEach((o, idx) => { if (idx !== i) o.isCorrect = false; });
    }
    setOptions(newOpts);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) { toast.error('Teks soal wajib diisi'); return; }
    setSaving(true);

    const questionPayload = {
      question_text: form.question_text, question_type: form.question_type,
      subject_id: form.subject_id || null, teacher_id: profile?.id,
      difficulty: form.difficulty, score_weight: form.score_weight, explanation: form.explanation,
    };

    let questionId = editingQ?.id;
    if (editingQ) {
      const { error } = await supabase.from('questions').update(questionPayload).eq('id', editingQ.id);
      if (error) { toast.error('Gagal memperbarui soal'); setSaving(false); return; }
      await supabase.from('question_options').delete().eq('question_id', editingQ.id);
    } else {
      const { data, error } = await supabase.from('questions').insert(questionPayload).select().single();
      if (error || !data) { toast.error('Gagal membuat soal'); setSaving(false); return; }
      questionId = data.id;
    }

    if (form.question_type !== 'essay' && options.some(o => o.text.trim())) {
      const optPayloads = options.filter(o => o.text.trim()).map((o, i) => ({
        question_id: questionId!, option_text: o.text, is_correct: o.isCorrect, option_order: i, match_pair: o.matchPair,
      }));
      await supabase.from('question_options').insert(optPayloads);
    }

    setSaving(false);
    toast.success(editingQ ? 'Soal diperbarui' : 'Soal dibuat');
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (q: Question) => {
    if (!confirm('Hapus soal ini?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', q.id);
    if (error) toast.error('Gagal menghapus soal');
    else { toast.success('Soal dihapus'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari soal..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {Object.entries(questionTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" />Tambah Soal
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BookMarked className="w-4 h-4" />Bank Soal ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Soal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q, i) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-slate-400 text-sm">{i + 1}</TableCell>
                    <TableCell className="max-w-sm">
                      <p className="text-sm text-slate-700 line-clamp-2">{q.question_text}</p>
                      <p className="text-xs text-slate-400 mt-1">{(q.options || []).length} pilihan</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{questionTypeLabels[q.question_type]}</Badge></TableCell>
                    <TableCell className="text-slate-500 text-sm">{(q as Question & { subject?: Subject }).subject?.name || '-'}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[q.difficulty]}`}>{difficultyLabels[q.difficulty]}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(q)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-10">Tidak ada soal ditemukan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQ ? 'Edit Soal' : 'Tambah Soal Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Soal</Label>
                <Select value={form.question_type} onValueChange={v => handleTypeChange(v as QuestionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(questionTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="space-y-2">
              <Label>Teks Soal *</Label>
              <Textarea value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} placeholder="Masukkan pertanyaan..." rows={4} className="resize-none" />
            </div>

            {form.question_type !== 'essay' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pilihan Jawaban</Label>
                  {form.question_type === 'multiple_choice' && <p className="text-xs text-slate-400">Centang satu jawaban benar</p>}
                  {form.question_type === 'multiple_answer' && <p className="text-xs text-slate-400">Centang jawaban benar (boleh lebih dari satu)</p>}
                  {form.question_type !== 'true_false' && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, { text: '', isCorrect: false, matchPair: '' }])}>
                      <Plus className="w-3 h-3 mr-1" />Tambah
                    </Button>
                  )}
                </div>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={opt.isCorrect}
                      onCheckedChange={v => handleOptionChange(i, 'isCorrect', !!v)}
                      className="flex-shrink-0"
                    />
                    <Input
                      value={opt.text}
                      onChange={e => handleOptionChange(i, 'text', e.target.value)}
                      placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                      disabled={form.question_type === 'true_false'}
                    />
                    {form.question_type === 'matching' && (
                      <Input
                        value={opt.matchPair}
                        onChange={e => handleOptionChange(i, 'matchPair', e.target.value)}
                        placeholder="Pasangan..."
                        className="flex-1"
                      />
                    )}
                    {form.question_type !== 'true_false' && options.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                        <X className="w-4 h-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tingkat Kesulitan</Label>
                <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Mudah</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="hard">Sulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bobot Nilai</Label>
                <Input type="number" min={1} max={100} value={form.score_weight} onChange={e => setForm({ ...form, score_weight: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pembahasan (Opsional)</Label>
              <Textarea value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} placeholder="Penjelasan jawaban..." rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingQ ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
