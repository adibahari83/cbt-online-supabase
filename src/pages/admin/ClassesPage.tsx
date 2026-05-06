import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Class, Profile } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', teacher_id: '', academic_year: '' });

  const fetchData = async () => {
    setLoading(true);
    const [classesRes, teachersRes] = await Promise.all([
      supabase.from('classes').select('*, teacher:profiles(*)').order('name'),
      supabase.from('profiles').select('*').eq('role', 'teacher'),
    ]);
    setClasses(classesRes.data || []);
    setTeachers(teachersRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: '', description: '', teacher_id: '', academic_year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1) });
    setDialogOpen(true);
  };

  const openEdit = (cls: Class) => {
    setEditingClass(cls);
    setForm({ name: cls.name, description: cls.description, teacher_id: cls.teacher_id || '', academic_year: cls.academic_year });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama kelas wajib diisi'); return; }
    setSaving(true);
    const payload = { name: form.name, description: form.description, teacher_id: form.teacher_id || null, academic_year: form.academic_year };
    const { error } = editingClass
      ? await supabase.from('classes').update(payload).eq('id', editingClass.id)
      : await supabase.from('classes').insert(payload);
    setSaving(false);
    if (error) toast.error('Gagal menyimpan kelas');
    else { toast.success(editingClass ? 'Kelas diperbarui' : 'Kelas dibuat'); setDialogOpen(false); fetchData(); }
  };

  const handleDelete = async (cls: Class) => {
    if (!confirm(`Hapus kelas ${cls.name}?`)) return;
    const { error } = await supabase.from('classes').delete().eq('id', cls.id);
    if (error) toast.error('Gagal menghapus kelas');
    else { toast.success('Kelas dihapus'); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Cari kelas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" />Tambah Kelas
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />Daftar Kelas ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead>Tahun Ajaran</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-medium text-slate-700">{cls.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{(cls as Class & { teacher?: Profile }).teacher?.full_name || '-'}</TableCell>
                    <TableCell className="text-slate-500">{cls.academic_year || '-'}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">{cls.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cls)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-10">Tidak ada kelas ditemukan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kelas *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: XII IPA 1" />
            </div>
            <div className="space-y-2">
              <Label>Wali Kelas</Label>
              <Select value={form.teacher_id || 'none'} onValueChange={v => setForm({ ...form, teacher_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">- Belum Ditentukan -</SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2025/2026" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opsional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingClass ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
