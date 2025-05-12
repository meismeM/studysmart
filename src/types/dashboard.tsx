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