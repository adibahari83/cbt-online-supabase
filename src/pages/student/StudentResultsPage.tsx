import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Result, Exam } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, CheckCircle2, XCircle, Loader2, Trophy, TrendingUp } from 'lucide-react';

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const [results, setResults] = useState<(Result & { exam?: Exam })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!profile) return;
      setLoading(true);
      const { data } = await supabase.from('results').select('*, exam:exams(*)')
        .eq('student_id', profile.id).order('graded_at', { ascending: false });
      setResults(data || []);
      setLoading(false);
    };
    fetchResults();
  }, [profile]);

  const avg = results.length ? results.reduce((a, r) => a + r.final_score, 0) / results.length : 0;
  const passed = results.filter(r => r.is_passed).length;

  const chartData = results.slice(0, 8).reverse().map(r => ({
    name: (r.exam?.title || '').slice(0, 12) + '...',
    nilai: r.final_score,
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-60"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Ujian', value: results.length, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Lulus', value: `${passed}/${results.length}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rata-rata Nilai', value: avg.toFixed(1), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Perkembangan Nilai</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="nilai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" />Riwayat Hasil Ujian</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada hasil ujian</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(result => (
                <div key={result.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 truncate">{result.exam?.title || 'Ujian'}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />{result.correct_answers} benar
                      </div>
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <XCircle className="w-3.5 h-3.5" />{result.wrong_answers} salah
                      </div>
                      <span className="text-xs text-slate-400">{result.total_questions} soal</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${result.final_score >= 70 ? 'text-emerald-600' : result.final_score >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {result.final_score.toFixed(0)}
                      </div>
                      <p className="text-xs text-slate-400">{new Date(result.graded_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <Badge className={result.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                      {result.is_passed ? 'Lulus' : 'Tidak Lulus'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
