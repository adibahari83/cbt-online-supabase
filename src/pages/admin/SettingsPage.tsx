import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, User, Lock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    setSaving(false);
    if (error) toast.error('Gagal menyimpan profil');
    else { toast.success('Profil diperbarui'); refreshProfile(); }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('Kata sandi minimal 6 karakter'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) toast.error('Gagal mengubah kata sandi');
    else { toast.success('Kata sandi berhasil diubah'); setNewPassword(''); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />Profil Pengguna</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ''} disabled className="bg-slate-50" /></div>
          <div className="space-y-2"><Label>Peran</Label><Input value={profile?.role === 'admin' ? 'Administrator' : profile?.role === 'teacher' ? 'Guru' : 'Siswa'} disabled className="bg-slate-50" /></div>
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nama Lengkap" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="bg-blue-600 hover:bg-blue-500">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}<Save className="w-4 h-4 mr-2" />Simpan Profil
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" />Keamanan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kata Sandi Baru</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 karakter" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPw} variant="outline">
            {savingPw && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Ubah Kata Sandi
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />Informasi Sistem</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-500">
          <div className="flex justify-between"><span>Versi Aplikasi</span><span className="font-medium text-slate-700">1.0.0</span></div>
          <Separator />
          <div className="flex justify-between"><span>Database</span><span className="font-medium text-slate-700">Supabase PostgreSQL</span></div>
          <Separator />
          <div className="flex justify-between"><span>Frontend</span><span className="font-medium text-slate-700">React + TypeScript</span></div>
          <Separator />
          <div className="flex justify-between"><span>UI Library</span><span className="font-medium text-slate-700">shadcn/ui + Tailwind CSS</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
