import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Exam, Result, Profile } from '@/lib/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Download, Loader2, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export default function GradesPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [results, setResults] = useState<(Result & { student?: Profile })[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExams = async () => {
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
    setExams(data || []);
    if (data && data.length > 0) setSelectedExam((data[0] as Exam).id);
  };

  const fetchResults = async () => {
    if (!selectedExam) return;
    setLoading(true);
    const { data } = await supabase.from('results').select('*, student:profiles(*)').eq('exam_id', selectedExam).order('final_score', { ascending: false });
    setResults(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);
  useEffect(() => { fetchResults(); }, [selectedExam]);

  const avg = results.length ? results.reduce((a, r) => a + r.final_score, 0) / results.length : 0;
  const highest = results.length ? Math.max(...results.map(r => r.final_score)) : 0;
  const lowest = results.length ? Math.min(...results.map(r => r.final_score)) : 0;
  const passed = results.filter(r => r.is_passed).length;

  const scoreDistribution = [
    { range: '0-39', count: results.filter(r => r.final_score < 40).length },
    { range: '40-59', count: results.filter(r => r.final_score >= 40 && r.final_score < 60).length },
    { range: '60-69', count: results.filter(r => r.final_score >= 60 && r.final_score < 70).length },
    { range: '70-84', count: results.filter(r => r.final_score >= 70 && r.final_score < 85).length },
    { range: '85-100', count: results.filter(r => r.final_score >= 85).length },
  ];

  const pieData = [
    { name: 'Lulus', value: passed, color: '#22c55e' },
    { name: 'Tidak Lulus', value: results.length - passed, color: '#ef4444' },
  ];

  const exportCSV = () => {
    const header = 'Nama,Email,Benar,Salah,Tidak Dijawab,Nilai,Status\n';
    const rows = results.map(r => `${r.student?.full_name},${r.student?.email},${r.correct_answers},${r.wrong_answers},${r.unanswered},${r.final_score},${r.is_passed ? 'Lulus' : 'Tidak Lulus'}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'hasil-ujian.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="w-72">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger><SelectValue placeholder="Pilih Ujian" /></SelectTrigger>
            <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={results.length === 0}>
          <Download className="w-4 h-4 mr-2" />Ekspor CSV
        </Button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Rata-rata Nilai', value: avg.toFixed(1), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Nilai Tertinggi', value: highest.toFixed(1), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Nilai Terendah', value: lowest.toFixed(1), icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
            { label: `Lulus (${((passed / results.length) * 100).toFixed(0)}%)`, value: `${passed}/${results.length}`, icon: CheckCircle2, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Nilai</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Kelulusan</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {pieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: entry.color }} />
                      <span className="text-sm text-slate-600">{entry.name}: <strong>{entry.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Nilai Siswa ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Belum ada hasil ujian</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Benar</TableHead>
                  <TableHead>Salah</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Selesai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, i) => (
                  <TableRow key={result.id}>
                    <TableCell className="text-slate-400">{i + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-700">{result.student?.full_name}</p>
                        <p className="text-xs text-slate-400">{result.student?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-medium">{result.correct_answers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="font-medium">{result.wrong_answers}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-bold text-lg ${result.final_score >= 70 ? 'text-emerald-600' : result.final_score >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {result.final_score.toFixed(0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={result.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {result.is_passed ? 'Lulus' : 'Tidak Lulus'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{new Date(result.graded_at).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
