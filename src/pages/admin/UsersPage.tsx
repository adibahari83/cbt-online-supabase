import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'student', password: '' });

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ full_name: '', email: '', role: 'student', password: '' });
    setDialogOpen(true);
  };

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    setForm({ full_name: user.full_name, email: user.email, role: user.role, password: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editingUser) {
      const { error } = await supabase.from('profiles').update({ full_name: form.full_name, role: form.role, updated_at: new Date().toISOString() }).eq('id', editingUser.id);
      if (error) toast.error('Gagal memperbarui pengguna');
      else { toast.success('Pengguna diperbarui'); setDialogOpen(false); fetchUsers(); }
    } else {
      const { error } = await supabase.auth.admin ?
        { error: new Error('Gunakan fitur undang pengguna') } :
        await supabase.auth.signUp({ email: form.email, password: form.password || 'default123', options: { data: { full_name: form.full_name, role: form.role } } });
      if (error) toast.error('Gagal membuat pengguna: ' + error.message);
      else { toast.success('Pengguna dibuat'); setDialogOpen(false); fetchUsers(); }
    }
    setSaving(false);
  };

  const handleDelete = async (user: Profile) => {
    if (!confirm(`Hapus pengguna ${user.full_name}?`)) return;
    const { error } = await supabase.from('profiles').update({ role: user.role }).eq('id', user.id);
    if (error) toast.error('Gagal menghapus pengguna');
    else { toast.success('Pengguna dihapus'); fetchUsers(); }
  };

  const roleColor = (role: string) => role === 'admin' ? 'destructive' : role === 'teacher' ? 'default' : 'secondary';
  const roleLabel = (role: string) => role === 'admin' ? 'Admin' : role === 'teacher' ? 'Guru' : 'Siswa';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari pengguna..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peran</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Guru</SelectItem>
              <SelectItem value="student">Siswa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" />Tambah Pengguna
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Daftar Pengguna ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xs">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
                        </div>
                        <span className="font-medium text-slate-700">{user.full_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell><Badge variant={roleColor(user.role)}>{roleLabel(user.role)}</Badge></TableCell>
                    <TableCell className="text-slate-500 text-sm">{new Date(user.created_at).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-10">Tidak ada pengguna ditemukan</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nama Lengkap" />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@contoh.com" />
                </div>
                <div className="space-y-2">
                  <Label>Kata Sandi Awal</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 karakter" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Guru</SelectItem>
                  <SelectItem value="student">Siswa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingUser ? 'Simpan' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
