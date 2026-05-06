import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Exam, Question, QuestionOption, StudentAnswer } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Flag, Loader2, Send, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type QuestionWithOptions = Question & { options?: QuestionOption[] };

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [studentExamId, setStudentExamId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cheatWarning, setCheatWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initExam = useCallback(async () => {
    if (!examId || !profile) return;
    setLoading(true);

    const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single();
    if (!examData) { navigate('/student/exams'); return; }
    setExam(examData);

    const { data: eqData } = await supabase
      .from('exam_questions')
      .select('*, question:questions(*, options:question_options(*))')
      .eq('exam_id', examId)
      .order('question_order');

    const qs = (eqData || []).map(eq => eq.question as QuestionWithOptions);
    if (examData.shuffle_questions) qs.sort(() => Math.random() - 0.5);
    setQuestions(qs);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessionData: any = null;
    const existingSession = await supabase.from('student_exams').select('*').eq('exam_id', examId).eq('student_id', profile.id).maybeSingle();

    if (!existingSession.data) {
      const { data: newSession } = await supabase.from('student_exams').insert({
        exam_id: examId, student_id: profile.id, status: 'in_progress',
        started_at: new Date().toISOString(),
        time_remaining_seconds: examData.duration_minutes * 60,
      }).select().single();
      sessionData = newSession;
    } else {
      sessionData = existingSession.data;
      if (sessionData.status === 'in_progress') {
        await supabase.from('student_exams').update({ status: 'in_progress' }).eq('id', sessionData.id);
      }
    }

    if (!sessionData) { navigate('/student/exams'); return; }
    setStudentExamId(sessionData.id);
    const remaining = sessionData.time_remaining_seconds ?? examData.duration_minutes * 60;
    setTimeLeft(remaining);

    const { data: existingAnswers } = await supabase.from('student_answers').select('*').eq('student_exam_id', sessionData.id);
    const answerMap: Record<string, StudentAnswer> = {};
    (existingAnswers || []).forEach(a => { answerMap[a.question_id] = a; });
    setAnswers(answerMap);

    setLoading(false);
  }, [examId, profile, navigate]);

  useEffect(() => { initExam(); }, [initExam]);

  // Timer
  useEffect(() => {
    if (!studentExamId || timeLeft <= 0 || loading) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleAutoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [studentExamId, loading]);

  // Save time remaining periodically
  useEffect(() => {
    if (!studentExamId) return;
    const save = setInterval(async () => {
      await supabase.from('student_exams').update({ time_remaining_seconds: timeLeft }).eq('id', studentExamId);
    }, 30000);
    return () => clearInterval(save);
  }, [studentExamId, timeLeft]);

  // Anti-cheat: tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && studentExamId) {
        setTabSwitchCount(c => c + 1);
        setCheatWarning(true);
        supabase.from('student_exams').select('tab_switch_count').eq('id', studentExamId).single().then(({ data }) => {
          supabase.from('student_exams').update({ tab_switch_count: (data?.tab_switch_count || 0) + 1 }).eq('id', studentExamId);
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [studentExamId]);

  const saveAnswer = useCallback(async (questionId: string, answer: Partial<StudentAnswer>) => {
    if (!studentExamId) return;
    const existing = answers[questionId];
    if (existing) {
      await supabase.from('student_answers').update({ ...answer, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      const { data } = await supabase.from('student_answers').insert({ student_exam_id: studentExamId, question_id: questionId, ...answer }).select().single();
      if (data) setAnswers(prev => ({ ...prev, [questionId]: data }));
    }
  }, [studentExamId, answers]);

  const handleOptionSelect = (questionId: string, optionId: string, type: string) => {
    const current = answers[questionId]?.selected_options || [];
    let newOptions: string[];
    if (type === 'multiple_choice' || type === 'true_false') {
      newOptions = [optionId];
    } else {
      newOptions = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId];
    }
    const updated = { ...answers[questionId], selected_options: newOptions };
    setAnswers(prev => ({ ...prev, [questionId]: updated as StudentAnswer }));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAnswer(questionId, { selected_options: newOptions }), 1000);
  };

  const handleEssayChange = (questionId: string, text: string) => {
    const updated = { ...answers[questionId], essay_answer: text };
    setAnswers(prev => ({ ...prev, [questionId]: updated as StudentAnswer }));
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAnswer(questionId, { essay_answer: text }), 1500);
  };

  const handleFlag = async (questionId: string) => {
    const current = answers[questionId]?.is_flagged ?? false;
    const updated = { ...answers[questionId], is_flagged: !current };
    setAnswers(prev => ({ ...prev, [questionId]: updated as StudentAnswer }));
    await saveAnswer(questionId, { is_flagged: !current });
  };

  const handleAutoSubmit = async () => {
    if (!studentExamId) return;
    await supabase.from('student_exams').update({ status: 'timed_out', submitted_at: new Date().toISOString() }).eq('id', studentExamId);
    await computeResults();
    navigate('/student/results');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await supabase.from('student_exams').update({ status: 'submitted', submitted_at: new Date().toISOString(), time_remaining_seconds: timeLeft }).eq('id', studentExamId!);
    await computeResults();
    setSubmitting(false);
    toast.success('Ujian berhasil diserahkan!');
    navigate('/student/results');
  };

  const computeResults = async () => {
    if (!studentExamId || !examId || !profile || !exam) return;
    let correct = 0, wrong = 0, unanswered = 0;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (!ans || ((!ans.selected_options || ans.selected_options.length === 0) && !ans.essay_answer)) {
        unanswered++;
      } else if (q.question_type === 'essay') {
        // essay not auto-graded
      } else {
        const correctOpts = (q.options || []).filter(o => o.is_correct).map(o => o.id).sort();
        const selected = [...(ans.selected_options || [])].sort();
        if (JSON.stringify(correctOpts) === JSON.stringify(selected)) correct++;
        else wrong++;
      }
    });
    const total = questions.length;
    const rawScore = total > 0 ? (correct / total) * 100 : 0;
    await supabase.from('results').insert({
      student_exam_id: studentExamId, exam_id: examId, student_id: profile.id,
      total_questions: total, correct_answers: correct, wrong_answers: wrong, unanswered,
      raw_score: rawScore, final_score: rawScore, is_passed: rawScore >= (exam.passing_score || 60),
      graded_at: new Date().toISOString(),
    });
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).filter(qId => {
    const a = answers[qId];
    return (a.selected_options && a.selected_options.length > 0) || (a.essay_answer && a.essay_answer.trim().length > 0);
  }).length;

  const timerColor = timeLeft < 300 ? 'text-red-500' : timeLeft < 600 ? 'text-orange-500' : 'text-slate-700';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Memuat ujian...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Anti-cheat Warning */}
      {cheatWarning && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Peringatan!</h2>
            <p className="text-slate-600 mb-2">Terdeteksi perpindahan tab/jendela. Tindakan ini telah dicatat.</p>
            <p className="text-orange-500 font-medium mb-6">Pelanggaran ke-{tabSwitchCount}</p>
            <Button onClick={() => setCheatWarning(false)} className="bg-blue-600 hover:bg-blue-500 w-full">
              Kembali ke Ujian
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="font-bold text-slate-800 text-sm">{exam?.title}</h1>
              <p className="text-xs text-slate-400">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400">Dijawab</p>
              <p className="text-sm font-bold text-slate-700">{answeredCount}/{questions.length}</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${timeLeft < 300 ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-100 ' + timerColor}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button onClick={() => setSubmitDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Send className="w-4 h-4 mr-2" />Serahkan
            </Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-2">
          <Progress value={(answeredCount / questions.length) * 100} className="h-1.5" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 flex gap-4">
        {/* Question Panel */}
        <div className="flex-1 min-w-0">
          {currentQ && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {currentIndex + 1}
                  </span>
                  <div>
                    <span className="text-xs text-slate-400">Soal {currentIndex + 1} dari {questions.length}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      {currentQ.question_type === 'multiple_choice' ? 'Pilihan Ganda' :
                       currentQ.question_type === 'multiple_answer' ? 'Pilihan Ganda Kompleks' :
                       currentQ.question_type === 'true_false' ? 'Benar/Salah' :
                       currentQ.question_type === 'matching' ? 'Menjodohkan' : 'Esai'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFlag(currentQ.id)}
                  className={cn('gap-2', currentAnswer?.is_flagged ? 'text-orange-500 bg-orange-50' : 'text-slate-400')}
                >
                  <Flag className="w-4 h-4" />
                  {currentAnswer?.is_flagged ? 'Ragu-ragu' : 'Tandai'}
                </Button>
              </div>

              <p className="text-slate-800 text-base mb-6 leading-relaxed">{currentQ.question_text}</p>

              {currentQ.question_type === 'essay' ? (
                <Textarea
                  value={currentAnswer?.essay_answer || ''}
                  onChange={e => handleEssayChange(currentQ.id, e.target.value)}
                  placeholder="Tulis jawaban Anda di sini..."
                  rows={8}
                  className="resize-none"
                />
              ) : (
                <div className="space-y-3">
                  {(currentQ.options || []).sort((a, b) => a.option_order - b.option_order).map((opt, i) => {
                    const selected = (currentAnswer?.selected_options || []).includes(opt.id);
                    const isMultiple = currentQ.question_type === 'multiple_answer';
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(currentQ.id, opt.id, currentQ.question_type)}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150',
                          selected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        {isMultiple ? (
                          <Checkbox checked={selected} className="flex-shrink-0" />
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                          )}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        )}
                        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0', selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-slate-700 text-sm">{opt.option_text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                  <ChevronLeft className="w-4 h-4 mr-2" />Sebelumnya
                </Button>
                <span className="text-sm text-slate-400">{currentIndex + 1} / {questions.length}</span>
                <Button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1} className="bg-blue-600 hover:bg-blue-500">
                  Selanjutnya<ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Panel */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-24">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-1.5 mb-4">
              {questions.map((q, i) => {
                const ans = answers[q.id];
                const isAnswered = (ans?.selected_options?.length ?? 0) > 0 || (ans?.essay_answer?.trim().length ?? 0) > 0;
                const isFlagged = ans?.is_flagged;
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      'w-9 h-9 rounded-lg text-xs font-bold transition-all',
                      isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                      isFlagged ? 'bg-orange-100 text-orange-600 border-2 border-orange-300' :
                      isAnswered ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-blue-500" /><span className="text-slate-500">Sudah dijawab</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-100 border border-slate-300" /><span className="text-slate-500">Belum dijawab</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-300" /><span className="text-slate-500">Ragu-ragu</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded border-2 border-blue-500" /><span className="text-slate-500">Soal saat ini</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Konfirmasi Penyerahan</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-slate-600 text-sm">Apakah Anda yakin ingin menyerahkan ujian?</p>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Soal dijawab:</span><span className="font-semibold text-emerald-600">{answeredCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Belum dijawab:</span><span className="font-semibold text-red-500">{questions.length - answeredCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Waktu tersisa:</span><span className={`font-semibold font-mono ${timerColor}`}>{formatTime(timeLeft)}</span></div>
            </div>
            {questions.length - answeredCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <p className="text-xs text-orange-600">Ada {questions.length - answeredCount} soal yang belum dijawab</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Kembali</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500">
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Ya, Serahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
