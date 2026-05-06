export type Role = 'admin' | 'teacher' | 'student';
export type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false' | 'matching' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExamStatus = 'not_started' | 'in_progress' | 'submitted' | 'timed_out';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  teacher_id: string | null;
  academic_year: string;
  created_at: string;
  updated_at: string;
  teacher?: Profile;
  student_count?: number;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  created_at: string;
  student?: Profile;
  class?: Class;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  teacher_id: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Profile;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
  match_pair: string;
  created_at: string;
}

export interface Question {
  id: string;
  subject_id: string | null;
  teacher_id: string | null;
  question_text: string;
  question_type: QuestionType;
  score_weight: number;
  difficulty: Difficulty;
  explanation: string;
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
  subject?: Subject;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  subject_id: string | null;
  teacher_id: string | null;
  class_id: string | null;
  token: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  passing_score: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  class?: Class;
  teacher?: Profile;
  question_count?: number;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  question_order: number;
  created_at: string;
  question?: Question;
}

export interface StudentExam {
  id: string;
  exam_id: string;
  student_id: string;
  status: ExamStatus;
  started_at: string | null;
  submitted_at: string | null;
  time_remaining_seconds: number | null;
  tab_switch_count: number;
  created_at: string;
  updated_at: string;
  exam?: Exam;
  student?: Profile;
}

export interface StudentAnswer {
  id: string;
  student_exam_id: string;
  question_id: string;
  selected_options: string[];
  essay_answer: string;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface Result {
  id: string;
  student_exam_id: string;
  exam_id: string;
  student_id: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  raw_score: number;
  final_score: number;
  is_passed: boolean;
  graded_at: string;
  graded_by: string | null;
  created_at: string;
  student?: Profile;
  exam?: Exam;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      classes: { Row: Class; Insert: Partial<Class>; Update: Partial<Class> };
      class_students: { Row: ClassStudent; Insert: Partial<ClassStudent>; Update: Partial<ClassStudent> };
      subjects: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      questions: { Row: Question; Insert: Partial<Question>; Update: Partial<Question> };
      question_options: { Row: QuestionOption; Insert: Partial<QuestionOption>; Update: Partial<QuestionOption> };
      exams: { Row: Exam; Insert: Partial<Exam>; Update: Partial<Exam> };
      exam_questions: { Row: ExamQuestion; Insert: Partial<ExamQuestion>; Update: Partial<ExamQuestion> };
      student_exams: { Row: StudentExam; Insert: Partial<StudentExam>; Update: Partial<StudentExam> };
      student_answers: { Row: StudentAnswer; Insert: Partial<StudentAnswer>; Update: Partial<StudentAnswer> };
      results: { Row: Result; Insert: Partial<Result>; Update: Partial<Result> };
    };
  };
}
