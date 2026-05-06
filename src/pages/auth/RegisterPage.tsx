import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Kata sandi tidak cocok');
      return;
    }
    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName, formData.role);
    setLoading(false);
    if (error) {
      toast.error('Pendaftaran gagal: ' + error.message);
    } else {
      toast.success('Akun berhasil dibuat! Silakan masuk.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CBT Online</h1>
          <p className="text-blue-300 mt-1">Buat akun baru</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-xl">Daftar Akun</CardTitle>
            <CardDescription className="text-blue-200">Isi data diri Anda untuk mendaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-blue-100">Nama Lengkap</Label>
                <Input
                  placeholder="Nama Lengkap"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100">Email</Label>
                <Input
                  type="email"
                  placeholder="nama@sekolah.ac.id"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100">Peran</Label>
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Siswa</SelectItem>
                    <SelectItem value="teacher">Guru</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100">Kata Sandi</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 karakter"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="bg-white/10 border-white/20 text-white placeholder:text-blue-300 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-blue-100">Konfirmasi Kata Sandi</Label>
                <Input
                  type="password"
                  placeholder="Ulangi kata sandi"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading ? 'Memproses...' : 'Daftar'}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-blue-200 text-sm">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium underline">Masuk di sini</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
