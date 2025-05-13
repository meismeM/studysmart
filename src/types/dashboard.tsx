// src/types/dashboard.ts

export type ExplicitQuestionTypeValue = | 'multiple-choice' | 'short-answer' | 'fill-in-the-blank' | 'true-false';
export const availableQuestionTypes: readonly ExplicitQuestionTypeValue[] = [ 'multiple-choice', 'short-answer', 'fill-in-the-blank', 'true-false', ];
export type CurrentQuestionTypeValue = ExplicitQuestionTypeValue;

export const questionTypeTitles: Record<CurrentQuestionTypeValue, string> = { 
    'multiple-choice': 'Multiple Choice', 'short-answer': 'Short Answer', 
    'fill-in-the-blank': 'Fill-in-the-Blank', 'true-false': 'True/False', 
};

export type Question = { 
  question: string; 
  answer?: string; 
  options?: string[]; 
  correctAnswerIndex?: number;
  explanation?: string; 
};

// UserData should reflect your API user object structure
export type UserData = {
  id: string | number; // From database (e.g., users.id)
  phone_number?: string; // From API (users.phone_number)
  phoneNumber?: string; // For frontend consistency if preferred
  full_name?: string;    // From API (users.full_name)
  fullName?: string;    // For frontend consistency
  grade_level?: string;  // From API (users.grade_level)
  gradeLevel?: string;  // For frontend consistency
  is_confirmed?: boolean; // from users.is_confirmed
  isConfirmed?: boolean;
  registered_at?: string; // Or Date, from users.registered_at
  registeredAt?: string;
} | null;


export type SavedQuestionSet = {
    questionType: CurrentQuestionTypeValue;
    questions: Question[];
    selectedAnswers?: Record<number, number | undefined>;
    isSubmitted?: boolean;
    score?: { userScore: number, scorableQuestions: number, totalQuestions: number } | null;
    timestamp: number;
    subject: string; grade: string; startPage?: number; endPage?: number; 
    chapterContentSnippet?: string;
};

export type SavedNote = {
    notes: string;
    timestamp: number;
    subject: string; grade: string; startPage?: number; endPage?: number;
    chapterContentSnippet?: string;
};
