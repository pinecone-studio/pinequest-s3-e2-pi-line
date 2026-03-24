export type UserRole = "student" | "teacher" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_published: boolean;
  created_at: string;
}

export type QuestionType = "multiple_choice" | "true_false" | "essay";

export interface Question {
  id: string;
  exam_id: string;
  type: QuestionType;
  content: string;
  options: string[] | null;
  correct_answer: string | null;
  points: number;
  order_index: number;
}

export interface Answer {
  id: string;
  exam_id: string;
  question_id: string;
  user_id: string;
  answer: string;
  is_correct: boolean | null;
  score: number | null;
  submitted_at: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  user_id: string;
  total_score: number;
  max_score: number;
  status: "in_progress" | "submitted" | "graded";
  started_at: string;
  submitted_at: string | null;
}
