import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Subject, Profile } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Loader2, BookMarked } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', teacher_id: '' });

  const fetchData = async () => {
    setLoading(true);
    const [subjectsRes, teachersRes] = await Promise.all([
      supabase.from('subjects').select('*, teacher:profiles(*)').order('name'),
      supabase.from('profiles').select('*').eq('role', 'teacher'),
    ]);
    setSubjects(subjectsRes.data || []);
    setTeachers(teachersRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingSubject(null);
    setForm({ name: '', code: '', description: '', teacher_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({ name: subject.name, code: subject.code, description: subject.description, teacher_id: subject.teacher_id || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama mata pelajaran wajib diisi'); return; }
    setSaving(true);
    const payload = { name: form.name, code: form.code, description: form.description, teacher_id: form.teacher_id || null };
    const { error } = editingSubject
      ? await supabase.from('subjects').update(payload).eq('id', editingSubject.id)
      : await supabase.from('subjects').insert(payload);
    setSaving(false);
    if (error) toast.error('Gagal menyimpan mata pelajaran');
    else { toast.success(editingSubject ? 'Mata pelajaran diperbarui' : 'Mata pelajaran dibuat'); setDialogOpen(false); fetchData(); }
  };

  const handleDelete = async (subject: Subject) => {
    if (!confirm(`Hapus mata pelajaran ${subject.name}?`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
    if (error) toast.error('Gagal menghapus mata pelajaran');
    else { toast.success('Mata pelajaran dihapus'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Cari mata pelajaran..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" />Tambah Mata Pelajaran
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BookMarked className="w-4 h-4" />Daftar Mata Pelajaran ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Guru Pengampu</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookMarked className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-700">{subject.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono">{subject.code || '-'}</span></TableCell>
                    <TableCell className="text-slate-500">{(subject as Subject & { teacher?: Profile }).teacher?.full_name || '-'}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">{subject.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(subject)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(subject)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-10">Tidak ada mata pelajaran ditemukan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Matematika" /></div>
            <div className="space-y-2"><Label>Kode</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="MTK" /></div>
            <div className="space-y-2">
              <Label>Guru Pengampu</Label>
              <Select value={form.teacher_id || 'none'} onValueChange={v => setForm({ ...form, teacher_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">- Belum Ditentukan -</SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opsional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editingSubject ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
